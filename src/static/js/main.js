import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const { createApp, markRaw } = Vue;

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
            renderScale:
                typeof backgroundSettings !== "undefined"
                    ? backgroundSettings.renderScale
                    : 1.0,
            canvasWidth: Math.max(
                1,
                Math.round(
                    window.innerWidth *
                        (typeof backgroundSettings !== "undefined"
                            ? backgroundSettings.renderScale
                            : 1.0)
                )
            ),
            canvasHeight: Math.max(
                1,
                Math.round(
                    window.innerHeight *
                        (typeof backgroundSettings !== "undefined"
                            ? backgroundSettings.renderScale
                            : 1.0)
                )
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
            // Initialize Three.js scene
            this.scene = markRaw(new THREE.Scene());

            // Setup camera
            this.camera = markRaw(
                new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
            );

            // Setup renderer
            const canvas = document.getElementById("bg-canvas");
            this.renderer = markRaw(
                new THREE.WebGLRenderer({
                    canvas: canvas,
                    alpha: false,
                    antialias: false,
                    powerPreference: "high-performance",
                })
            );

            this.renderer.setSize(this.canvasWidth, this.canvasHeight);
            this.renderer.setPixelRatio(1);

            // Create gradient shader material
            const gradientMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uResolution: {
                        value: new THREE.Vector2(
                            this.canvasWidth,
                            this.canvasHeight
                        ),
                    },
                    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
                    uPointerDown: { value: 0.0 },
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform vec2 uResolution;
                    uniform vec2 uPointer;
                    uniform float uPointerDown;
                    varying vec2 vUv;
                    
                    // Simplex noise functions
                    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                    
                    float snoise(vec2 v) {
                        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                        vec2 i  = floor(v + dot(v, C.yy));
                        vec2 x0 = v - i + dot(i, C.xx);
                        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec4 x12 = x0.xyxy + C.xxzz;
                        x12.xy -= i1;
                        i = mod289(i);
                        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                        m = m*m;
                        m = m*m;
                        vec3 x = 2.0 * fract(p * C.www) - 1.0;
                        vec3 h = abs(x) - 0.5;
                        vec3 ox = floor(x + 0.5);
                        vec3 a0 = x - ox;
                        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                        vec3 g;
                        g.x  = a0.x  * x0.x  + h.x  * x0.y;
                        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                        return 130.0 * dot(m, g);
                    }
                    
                    // Fractal Brownian Motion for more organic waves
                    float fbm(vec2 p) {
                        float value = 0.0;
                        float amplitude = 0.5;
                        float frequency = 1.0;
                        
                        for(int i = 0; i < 5; i++) {
                            value += amplitude * snoise(p * frequency);
                            frequency *= 2.0;
                            amplitude *= 0.5;
                        }
                        return value;
                    }
                    
                    // Enhanced dithering for that grainy diffused look
                    float dither(vec2 coord) {
                        // Blue noise pattern
                        float noise1 = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);
                        float noise2 = fract(sin(dot(coord, vec2(93.9898, 67.345))) * 23421.6312);
                        return (noise1 + noise2) * 0.015 - 0.015;
                    }
                    
                    void main() {
                        vec2 uv = vUv;
                        vec2 resolution = uResolution;
                        
                        // Adjust UV for aspect ratio
                        vec2 aspectUv = uv;
                        float aspect = resolution.x / resolution.y;
                        aspectUv.x *= aspect;
                        
                        // Slow time for breathing effect
                        float time = uTime * 0.08;
                        
                        // Create complex wave distortion using FBM
                        vec2 distortion1 = vec2(
                            fbm(aspectUv * 1.5 + vec2(time * 0.4, time * 0.3)),
                            fbm(aspectUv * 1.5 + vec2(time * 0.3, -time * 0.4))
                        );
                        
                        vec2 distortion2 = vec2(
                            fbm(aspectUv * 0.8 + distortion1 * 0.3 + time * 0.2),
                            fbm(aspectUv * 0.8 + distortion1 * 0.3 - time * 0.15)
                        );
                        
                        // Apply layered distortion for wave diffusion
                        vec2 finalUv = aspectUv + distortion1 * 0.12 + distortion2 * 0.08;
                        
                        // Create the main gradient flow
                        float gradientFlow = finalUv.x * 0.6 + finalUv.y * 0.8;
                        
                        // Add wave motion
                        float wave1 = fbm(finalUv * 2.0 + time * 0.3) * 0.15;
                        float wave2 = fbm(finalUv * 1.2 - time * 0.2) * 0.1;
                        
                        gradientFlow += wave1 + wave2;
                        
                        // Pointer interaction
                        vec2 pointerInfluence = (uv - uPointer) * 1.5;
                        float pointerDist = length(pointerInfluence);
                        float pointerEffect = smoothstep(0.8, 0.0, pointerDist) * uPointerDown * 0.12;
                        gradientFlow += pointerEffect;
                        
                        // Color palette matching the reference image
                        vec3 color1 = vec3(0.02, 0.05, 0.15);  // Deep dark blue
                        vec3 color2 = vec3(0.15, 0.08, 0.28);  // Dark purple-blue
                        vec3 color3 = vec3(0.45, 0.12, 0.18);  // Deep magenta-red
                        vec3 color4 = vec3(0.85, 0.25, 0.15);  // Bright red-orange
                        vec3 color5 = vec3(0.95, 0.55, 0.25);  // Light orange
                        vec3 color6 = vec3(0.98, 0.75, 0.45);  // Pale orange/yellow
                        
                        // Smooth multi-step gradient
                        vec3 finalColor;
                        float t = gradientFlow;
                        
                        if (t < 0.2) {
                            finalColor = mix(color1, color2, smoothstep(0.0, 0.2, t));
                        } else if (t < 0.4) {
                            finalColor = mix(color2, color3, smoothstep(0.2, 0.4, t));
                        } else if (t < 0.6) {
                            finalColor = mix(color3, color4, smoothstep(0.4, 0.6, t));
                        } else if (t < 0.75) {
                            finalColor = mix(color4, color5, smoothstep(0.6, 0.75, t));
                        } else if (t < 0.9) {
                            finalColor = mix(color5, color6, smoothstep(0.75, 0.9, t));
                        } else {
                            finalColor = mix(color6, color5, smoothstep(0.9, 1.1, t));
                        }
                        
                        // Add subtle color variations based on noise
                        vec3 colorNoise = vec3(
                            snoise(finalUv * 3.0 + time * 0.1),
                            snoise(finalUv * 3.0 + time * 0.1 + 100.0),
                            snoise(finalUv * 3.0 + time * 0.1 + 200.0)
                        ) * 0.03;
                        
                        finalColor += colorNoise;
                        
                        // Add brightness variation for depth
                        float brightness = 1.0 + snoise(finalUv * 2.5 + time * 0.15) * 0.08;
                        finalColor *= brightness;
                        
                        // Apply grain/dither texture for diffused look
                        float grain = dither(gl_FragCoord.xy);
                        finalColor += grain;
                        
                        // Slight vignette for depth
                        float vignette = 1.0 - length(uv - 0.5) * 0.3;
                        finalColor *= vignette;
                        
                        // Ensure colors stay in valid range
                        finalColor = clamp(finalColor, 0.0, 1.0);
                        
                        gl_FragColor = vec4(finalColor, 1.0);
                    }
                `,
            });

            // Create full-screen quad
            const geometry = new THREE.PlaneGeometry(2, 2);
            const mesh = markRaw(new THREE.Mesh(geometry, gradientMaterial));
            this.scene.add(mesh);

            this.gradientTexture = gradientMaterial;

            // Setup event handlers
            this.setupEventHandlers();

            // Start animation loop
            this.animate();
        },

        setupEventHandlers() {
            // Pointer move handler - now activates on hover
            this.pointerMoveHandler = (e) => {
                if (this.gradientTexture) {
                    this.pointerX = e.clientX / window.innerWidth;
                    this.pointerY = 1.0 - e.clientY / window.innerHeight;
                    this.pointerIsDown = true; // Activate on hover
                }
            };
            window.addEventListener("pointermove", this.pointerMoveHandler);

            // Pointer leave handler to deactivate when mouse leaves
            this.pointerUpHandler = () => {
                this.pointerIsDown = false;
            };
            window.addEventListener("pointerleave", this.pointerUpHandler);

            // Window blur handler
            this.blurHandler = () => {
                this.pointerIsDown = false;
            };
            window.addEventListener("blur", this.blurHandler);

            // Resize handler
            this.resizeHandler = () => {
                this.canvasWidth = Math.max(
                    1,
                    Math.round(window.innerWidth * this.renderScale)
                );
                this.canvasHeight = Math.max(
                    1,
                    Math.round(window.innerHeight * this.renderScale)
                );

                if (this.renderer) {
                    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
                }

                if (this.gradientTexture) {
                    this.gradientTexture.uniforms.uResolution.value.set(
                        this.canvasWidth,
                        this.canvasHeight
                    );
                }
            };
            window.addEventListener("resize", this.resizeHandler);
        },

        animate() {
            this.animationFrameId = requestAnimationFrame(this.animate);

            const currentTime = performance.now() / 1000;

            if (this.gradientTexture) {
                // Update time uniform
                this.gradientTexture.uniforms.uTime.value = currentTime;

                // Smoothly update pointer position
                const currentPointer =
                    this.gradientTexture.uniforms.uPointer.value;
                currentPointer.x += (this.pointerX - currentPointer.x) * 0.1;
                currentPointer.y += (this.pointerY - currentPointer.y) * 0.1;

                // Smoothly update pointer down state
                const targetDown = this.pointerIsDown ? 1.0 : 0.0;
                const currentDown =
                    this.gradientTexture.uniforms.uPointerDown.value;
                this.gradientTexture.uniforms.uPointerDown.value +=
                    (targetDown - currentDown) * 0.1;
            }

            // Render the scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }

            this.lastFrameTime = currentTime;
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

        if (this.pointerUpHandler) {
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
