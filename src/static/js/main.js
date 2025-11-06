import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const { createApp, markRaw } = Vue;

const backgroundSettings = {
    color1: "#ff",
    color2: "#ee11dd",
    color3: "#5EF4EA",
    renderScale: 1,
    maxPixelRatio: 1.5,
};

const BASE_VERTEX_SHADER = `
precision highp float;
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const COMPUTE_FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uPreviousResult;
uniform vec2 uSize;
uniform vec2 uPointerPos;
uniform float uPointerDown;
uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uComputeResolution;

float gaussianFalloff(float dist, float radius) {
    float r = max(radius, 0.0001);
    return exp(-pow(dist / r, 2.0));
}

void main() {
    vec2 texel = 1.0 / max(uComputeResolution, vec2(1.0));
    float center = texture2D(uPreviousResult, vUv).r;
    float sum = 0.0;
    sum += texture2D(uPreviousResult, vUv + vec2(texel.x, 0.0)).r;
    sum += texture2D(uPreviousResult, vUv - vec2(texel.x, 0.0)).r;
    sum += texture2D(uPreviousResult, vUv + vec2(0.0, texel.y)).r;
    sum += texture2D(uPreviousResult, vUv - vec2(0.0, texel.y)).r;
    float diffusion = (sum * 0.25 - center) * 0.35;

    float value = center + diffusion;
    value *= exp(-1.5 * uDeltaTime);

    vec2 pointerUv = uPointerPos / max(uSize, vec2(1.0));
    float drop = gaussianFalloff(distance(vUv, pointerUv), 0.03) * uPointerDown;
    value += drop;

    value = clamp(value, 0.0, 1.0);
    gl_FragColor = vec4(value, value, value, 1.0);
}
`;

const RENDER_FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uGradientMap;
uniform sampler2D uComputeResult;
uniform vec2 uSize;
uniform vec2 uPointerPos;
uniform float uPointerDown;
uniform float uTime;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m *= m;
    m *= m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    float flow = texture2D(uComputeResult, vUv).r;
    vec2 warp = (vUv - 0.5) * flow * 0.18;

    float timeShift = sin(uTime * 0.35 + vUv.y * 5.0) * 0.02;
    float layerWave = snoise(vec2(vUv.x * 0.5 + uTime * 0.1, vUv.y * 4.0 - uTime * 0.08)) * 0.05;
    float verticalSweep = snoise(vec2(vUv.x * 1.4 + uTime * 0.05, vUv.y * 1.2 - uTime * 0.03)) * 0.4;

    float baseGradient = 1.0 - vUv.y;
    float gradientPos = clamp(baseGradient + warp.y + timeShift + layerWave + verticalSweep * 0.15, 0.0, 1.0);

    vec4 base = texture2D(uGradientMap, vec2(gradientPos, 0.5));

    vec2 pointerUv = uPointerPos / max(uSize, vec2(1.0));
    float pointerGlow = smoothstep(0.18, 0.0, distance(vUv, pointerUv)) * uPointerDown;

    float shimmer = (random(vUv * 8.0 + uTime * 0.05) - 0.5) * 0.035;
    float ambientPulse = sin(uTime * 0.4 + vUv.y * 6.28318) * 0.02;
    vec3 waveTint = vec3(0.12, 0.04, 0.18) * verticalSweep;

    vec3 color = base.rgb;
    color += flow * vec3(0.18, -0.04, 0.22);
    color += pointerGlow * vec3(0.25, 0.05, 0.3);
    color += waveTint;
    color += shimmer;
    color += ambientPulse;

    color = mix(base.rgb, color, 0.82);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), base.a);
}
`;

function getSupportedRenderTargetType(renderer) {
    const extensions = renderer.extensions;
    const { capabilities } = renderer;

    if (capabilities.isWebGL2) {
        if (extensions.has("EXT_color_buffer_float")) {
            return THREE.FloatType;
        }
        if (extensions.has("EXT_color_buffer_half_float")) {
            return THREE.HalfFloatType;
        }
        return THREE.UnsignedByteType;
    }

    if (
        extensions.has("OES_texture_float") &&
        extensions.has("WEBGL_color_buffer_float")
    ) {
        return THREE.FloatType;
    }

    if (
        extensions.has("OES_texture_half_float") &&
        extensions.has("EXT_color_buffer_half_float")
    ) {
        return THREE.HalfFloatType;
    }

    return THREE.UnsignedByteType;
}

class FluidEffect {
    constructor(renderer, gradientMapTexture, width, height) {
        this.renderer = renderer;
        this.gradientMapTexture = gradientMapTexture;
        this.width = width;
        this.height = height;
        this.time = 0;
        this.pointerIsDown = false;
        this.pointerPulse = 0;

        const type = getSupportedRenderTargetType(renderer);
        const fboWidth = Math.max(1, Math.floor(width * 0.1));
        const fboHeight = Math.max(1, Math.floor(height * 0.1));

        this.computeResolution = new THREE.Vector2(fboWidth, fboHeight);

        const commonTextureSettings = {
            generateMipmaps: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type,
            depthBuffer: false,
            stencilBuffer: false,
        };

        this.computeTargetA = new THREE.WebGLRenderTarget(
            fboWidth,
            fboHeight,
            commonTextureSettings
        );
        this.computeTargetB = new THREE.WebGLRenderTarget(
            fboWidth,
            fboHeight,
            commonTextureSettings
        );
        this.currentTarget = this.computeTargetA;

        this.computeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.computeMat = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: new THREE.Vector2(width, height) },
                uPointerPos: { value: new THREE.Vector2(0, 0) },
                uPointerDown: { value: 0 },
                uTime: { value: 0 },
                uDeltaTime: { value: 0 },
                uPreviousResult: { value: this.computeTargetB.texture },
                uComputeResolution: { value: this.computeResolution.clone() },
            },
            vertexShader: BASE_VERTEX_SHADER,
            fragmentShader: COMPUTE_FRAGMENT_SHADER,
        });

        this.computeScene = new THREE.Scene();
        const computeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.computeMat
        );
        this.computeScene.add(computeMesh);

        this.planeMat = new THREE.ShaderMaterial({
            uniforms: {
                uGradientMap: { value: gradientMapTexture },
                uComputeResult: { value: this.computeTargetA.texture },
                uTime: { value: 0 },
                uSize: { value: new THREE.Vector2(width, height) },
                uPointerPos: { value: new THREE.Vector2(0, 0) },
                uPointerDown: { value: 0 },
            },
            vertexShader: BASE_VERTEX_SHADER,
            fragmentShader: RENDER_FRAGMENT_SHADER,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        this.visibleMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.planeMat
        );

        this._clearTargets();
    }

    _clearTargets() {
        const prevTarget = this.renderer.getRenderTarget();
        const prevColor = this.renderer.getClearColor(new THREE.Color());
        const prevAlpha = this.renderer.getClearAlpha();

        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setRenderTarget(this.computeTargetA);
        this.renderer.clear(true, true, true);
        this.renderer.setRenderTarget(this.computeTargetB);
        this.renderer.clear(true, true, true);
        this.renderer.setRenderTarget(prevTarget);
        this.renderer.setClearColor(prevColor, prevAlpha);
    }

    setPointer(x, y) {
        this.computeMat.uniforms.uPointerPos.value.set(x, y);
        this.planeMat.uniforms.uPointerPos.value.set(x, y);
    }

    setPointerDown(isDown) {
        this.pointerIsDown = isDown;
        if (isDown) {
            this.pointerPulse = 1;
        } else {
            this.pointerPulse = Math.max(this.pointerPulse, 0.2);
        }
    }

    pulse(strength = 0.3) {
        this.pointerPulse = Math.min(1, this.pointerPulse + strength);
    }

    onResize(width, height) {
        this.width = width;
        this.height = height;

        this.computeMat.uniforms.uSize.value.set(width, height);
        this.planeMat.uniforms.uSize.value.set(width, height);

        const fboWidth = Math.max(1, Math.floor(width * 0.1));
        const fboHeight = Math.max(1, Math.floor(height * 0.1));
        this.computeResolution.set(fboWidth, fboHeight);
        this.computeMat.uniforms.uComputeResolution.value.set(
            fboWidth,
            fboHeight
        );

        this.computeTargetA.setSize(fboWidth, fboHeight);
        this.computeTargetB.setSize(fboWidth, fboHeight);

        this._clearTargets();
    }

    update(deltaTime) {
        const safeDelta = Math.max(deltaTime, 0);
        this.time += safeDelta;

        this.pointerPulse = Math.max(
            0,
            this.pointerPulse - safeDelta * (this.pointerIsDown ? 0.4 : 1.2)
        );
        const pointerStrength = this.pointerIsDown ? 1.0 : this.pointerPulse;

        this.computeMat.uniforms.uTime.value = this.time;
        this.computeMat.uniforms.uDeltaTime.value = safeDelta;
        this.computeMat.uniforms.uPointerDown.value = pointerStrength;
        this.planeMat.uniforms.uTime.value = this.time;
        this.planeMat.uniforms.uPointerDown.value = pointerStrength;

        const inputTarget = this.currentTarget;
        const outputTarget =
            inputTarget === this.computeTargetA
                ? this.computeTargetB
                : this.computeTargetA;

        this.computeMat.uniforms.uPreviousResult.value = outputTarget.texture;

        this.renderer.setRenderTarget(inputTarget);
        this.renderer.render(this.computeScene, this.computeCamera);

        this.planeMat.uniforms.uComputeResult.value = inputTarget.texture;

        this.currentTarget = outputTarget;
    }

    dispose() {
        this.computeTargetA.dispose();
        this.computeTargetB.dispose();
        this.computeMat.dispose();
        this.planeMat.dispose();
        this.visibleMesh.geometry.dispose();
    }
}

function createGradientTexture() {
    const size = 256;
    const data = new Uint8Array(size * 4);
    const stops = [
        { offset: 0, color: new THREE.Color(backgroundSettings.color1) },
        { offset: 0.5, color: new THREE.Color(backgroundSettings.color2) },
        { offset: 1, color: new THREE.Color(backgroundSettings.color3) },
    ];

    for (let i = 0; i < size; i += 1) {
        const t = i / (size - 1);

        let start = stops[0];
        let end = stops[stops.length - 1];

        for (let j = 0; j < stops.length - 1; j += 1) {
            const current = stops[j];
            const next = stops[j + 1];
            if (t >= current.offset && t <= next.offset) {
                start = current;
                end = next;
                break;
            }
        }

        const range = Math.max(end.offset - start.offset, 0.0001);
        const localT = THREE.MathUtils.clamp((t - start.offset) / range, 0, 1);
        const color = start.color.clone().lerp(end.color, localT);
        const stride = i * 4;
        data[stride] = Math.round(color.r * 255);
        data[stride + 1] = Math.round(color.g * 255);
        data[stride + 2] = Math.round(color.b * 255);
        data[stride + 3] = 255;
    }

    const texture = new THREE.DataTexture(
        data,
        size,
        1,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

const AlbumCovers = {
    template: "#albumcovers",
};

createApp({
    data() {
        return {
            scene: null,
            camera: null,
            renderer: null,
            gradientTexture: null,
            fluidEffect: null,
            albumcovers: false,
            renderScale: backgroundSettings.renderScale,
            canvasWidth: Math.max(
                1,
                Math.round(window.innerWidth * backgroundSettings.renderScale)
            ),
            canvasHeight: Math.max(
                1,
                Math.round(window.innerHeight * backgroundSettings.renderScale)
            ),
            animationFrameId: null,
            lastFrameTime: null,
            pointerIsDown: false,
            pointerX: 0,
            pointerY: 0,
            pointerMoveHandler: null,
            pointerDownHandler: null,
            pointerUpHandler: null,
            blurHandler: null,
            resizeHandler: null,
        };
    },
    components: {
        AlbumCovers,
    },
    delimiters: ["[[", "]]"],

    methods: {
        openAlbumCovers() {
            this.albumcovers = true;
        },
        closeAlbumCovers() {
            this.albumcovers = false;
        },
        initBackground() {
            const canvas = document.getElementById("bg-canvas");
            if (!canvas) {
                return;
            }

            this.scene = markRaw(new THREE.Scene());
            this.camera = markRaw(
                new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
            );
            this.renderer = markRaw(
                new THREE.WebGLRenderer({
                    canvas,
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance",
                })
            );
            this.handleResize();

            this.gradientTexture = createGradientTexture();

            this.fluidEffect = markRaw(
                new FluidEffect(
                    this.renderer,
                    this.gradientTexture,
                    this.canvasWidth,
                    this.canvasHeight
                )
            );
            this.scene.add(this.fluidEffect.visibleMesh);

            this.pointerX = this.canvasWidth * 0.5;
            this.pointerY = this.canvasHeight * 0.5;
            this.fluidEffect.setPointer(this.pointerX, this.pointerY);

            this.resizeHandler = () => this.handleResize();
            window.addEventListener("resize", this.resizeHandler);

            this.pointerMoveHandler = (event) => this.handlePointerMove(event);
            this.pointerDownHandler = (event) => this.handlePointerDown(event);
            this.pointerUpHandler = () => this.handlePointerUp();

            window.addEventListener("pointermove", this.pointerMoveHandler);
            window.addEventListener("pointerdown", this.pointerDownHandler);
            window.addEventListener("pointerup", this.pointerUpHandler);
            window.addEventListener("pointercancel", this.pointerUpHandler);
            window.addEventListener("pointerleave", this.pointerUpHandler);

            this.blurHandler = () => this.handlePointerUp();
            window.addEventListener("blur", this.blurHandler);

            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.animate);
        },

        animate(now = performance.now()) {
            this.animationFrameId = requestAnimationFrame(this.animate);

            const delta =
                this.lastFrameTime === null
                    ? 0
                    : Math.max((now - this.lastFrameTime) / 1000, 0);
            this.lastFrameTime = now;

            if (this.fluidEffect) {
                this.fluidEffect.update(delta);
            }

            if (this.renderer && this.scene && this.camera) {
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.scene, this.camera);
            }
        },

        handleResize() {
            if (!this.renderer) {
                return;
            }

            this.renderer.setPixelRatio(
                Math.min(
                    window.devicePixelRatio,
                    backgroundSettings.maxPixelRatio || window.devicePixelRatio
                )
            );

            this.renderScale = backgroundSettings.renderScale || 1;

            const previousWidth = this.canvasWidth;
            const previousHeight = this.canvasHeight;

            this.canvasWidth = Math.max(
                1,
                Math.round(window.innerWidth * this.renderScale)
            );
            this.canvasHeight = Math.max(
                1,
                Math.round(window.innerHeight * this.renderScale)
            );

            this.renderer.setSize(this.canvasWidth, this.canvasHeight, false);

            const rendererCanvas = this.renderer.domElement;
            rendererCanvas.style.width = `${window.innerWidth}px`;
            rendererCanvas.style.height = `${window.innerHeight}px`;

            if (previousWidth > 0 && previousHeight > 0) {
                const normalizedX = this.pointerX / previousWidth;
                const normalizedY = this.pointerY / previousHeight;
                this.pointerX = normalizedX * this.canvasWidth;
                this.pointerY = normalizedY * this.canvasHeight;
            } else {
                this.pointerX = this.canvasWidth * 0.5;
                this.pointerY = this.canvasHeight * 0.5;
            }

            if (this.fluidEffect) {
                this.fluidEffect.onResize(this.canvasWidth, this.canvasHeight);
                this.fluidEffect.setPointer(this.pointerX, this.pointerY);
            }
        },

        handlePointerMove(event) {
            if (!this.fluidEffect) {
                return;
            }

            const viewportWidth = Math.max(window.innerWidth, 1);
            const viewportHeight = Math.max(window.innerHeight, 1);

            const x = (event.clientX / viewportWidth) * this.canvasWidth;
            const y = (event.clientY / viewportHeight) * this.canvasHeight;

            this.pointerX = THREE.MathUtils.clamp(x, 0, this.canvasWidth);
            this.pointerY = THREE.MathUtils.clamp(
                this.canvasHeight - y,
                0,
                this.canvasHeight
            );

            this.fluidEffect.setPointer(this.pointerX, this.pointerY);
            this.fluidEffect.pulse(this.pointerIsDown ? 0.6 : 0.3);
        },

        handlePointerDown(event) {
            this.pointerIsDown = true;
            if (this.fluidEffect) {
                this.fluidEffect.setPointerDown(true);
            }
            this.handlePointerMove(event);
        },

        handlePointerUp() {
            this.pointerIsDown = false;
            if (this.fluidEffect) {
                this.fluidEffect.setPointerDown(false);
            }
        },

        animateTitle() {
            const title = document.getElementById("hero-title");
            const finalText = "Emily Yobal";
            const chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;:',.<>?/`~0123456789";

            title.innerHTML = finalText
                .split("")
                .map((char) => {
                    if (char === " ") {
                        return '<span class="char">&nbsp;</span>';
                    }
                    const randomChar =
                        chars[Math.floor(Math.random() * chars.length)];
                    return `<span class="char">${randomChar}</span>`;
                })
                .join("");

            const charElements = title.querySelectorAll(".char");
            const tl = gsap.timeline({ delay: 0.5 });

            gsap.set(charElements, {
                opacity: 0.5,
                scale: 0.8,
                color: "#888",
            });

            charElements.forEach((charEl, i) => {
                if (finalText[i] === " ") return;

                const delay = i * 0.06;
                const iterations = 10;

                for (let j = 0; j < iterations; j++) {
                    tl.call(
                        () => {
                            charEl.textContent =
                                chars[Math.floor(Math.random() * chars.length)];
                        },
                        null,
                        delay + j * 0.035
                    );
                }

                tl.call(
                    () => {
                        charEl.textContent = finalText[i];
                    },
                    null,
                    delay + iterations * 0.035
                );

                tl.to(
                    charEl,
                    {
                        opacity: 1,
                        scale: 1.05,
                        color: "#ffffff",
                        duration: 0.15,
                        ease: "back.out(3)",
                    },
                    delay + iterations * 0.035
                );

                tl.to(
                    charEl,
                    {
                        scale: 1,
                        duration: 0.6,
                        ease: "elastic.out(1, 0.5)",
                    },
                    delay + iterations * 0.035 + 0.15
                );
            });

            tl.to(
                title,
                {
                    textShadow: "0 0 20px rgba(255,255,255,0.5)",
                    duration: 0.3,
                    ease: "power2.in",
                },
                "+=0.2"
            ).to(title, {
                textShadow: "0 0 0px rgba(255,255,255,0)",
                duration: 0.4,
                ease: "power2.out",
            });

            tl.to({}, { duration: 0.8 });
        },
    },

    mounted() {
        gsap.registerPlugin(TextPlugin);

        this.animate = this.animate.bind(this);

        this.$nextTick(() => {
            this.initBackground();
            this.animateTitle();
        });
    },

    beforeUnmount() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.pointerMoveHandler) {
            window.removeEventListener("pointermove", this.pointerMoveHandler);
            this.pointerMoveHandler = null;
        }

        if (this.pointerDownHandler) {
            window.removeEventListener("pointerdown", this.pointerDownHandler);
            this.pointerDownHandler = null;
        }

        if (this.pointerUpHandler) {
            window.removeEventListener("pointerup", this.pointerUpHandler);
            window.removeEventListener("pointercancel", this.pointerUpHandler);
            window.removeEventListener("pointerleave", this.pointerUpHandler);
            this.pointerUpHandler = null;
        }

        if (this.blurHandler) {
            window.removeEventListener("blur", this.blurHandler);
            this.blurHandler = null;
        }

        if (this.scene && this.fluidEffect) {
            this.scene.remove(this.fluidEffect.visibleMesh);
        }

        if (this.fluidEffect) {
            this.fluidEffect.dispose();
            this.fluidEffect = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.gradientTexture) {
            this.gradientTexture.dispose();
            this.gradientTexture = null;
        }
        this.scene = null;
        this.camera = null;
    },
}).mount("#app");
