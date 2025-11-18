import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const { createApp, markRaw } = Vue;

const AlbumCovers = {
    template: "#albumcovers",
};

const Namaste = {
    template: "#namaste",
};

const Bob = {
    template: "#bob",
};

const Clickbuddy = {
    template: "#clickbuddy",
};

const Necoloco = {
    template: "#necoloco",
};

const Twin = {
    template: "#twin",
};

const Threed = {
    template: "#threed",
};

const Corners = {
    template: "#corners",
};

const Story = {
    template: "#story",
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
            namaste: false,
            bob: false,
            clickbuddy: false,
            necoloco: false,
            twin: false,
            threed: false,
            corners: false,
            story: false,
            currentPreview: null,
            targetPreview: null,
            isFlipped: false,
            isAnimating: false,
            animationQueue: [],
            clearPreviewTimeout: null,
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
            bobVideoObserver: null,
            bobVideoElements: [],
        };
    },
    components: {
        AlbumCovers,
        Namaste,
        Bob,
        Clickbuddy,
        Necoloco,
        Twin,
        Threed,
        Corners,
        Story,
    },
    delimiters: ["[[", "]]"],

    watch: {
        bob(isOpen) {
            if (isOpen) {
                this.$nextTick(() => {
                    this.setupBobVideos();
                });
            } else {
                this.teardownBobVideos();
            }
        },
    },

    methods: {
        openAlbumCovers() {
            this.albumcovers = true;
        },
        openNamaste() {
            this.namaste = true;
        },
        openBob() {
            this.bob = true;
        },
        openClickbuddy() {
            this.clickbuddy = true;
        },
        openNecoloco() {
            this.necoloco = true;
        },
        openTwin() {
            this.twin = true;
        },
        openThreed() {
            this.threed = true;
        },
        openCorners() {
            this.corners = true;
        },
        openStory() {
            this.story = true;
        },
        previewProject(projectName) {
            // Cancel any pending clear
            if (this.clearPreviewTimeout) {
                clearTimeout(this.clearPreviewTimeout);
                this.clearPreviewTimeout = null;
            }

            // Update target and process queue
            this.targetPreview = projectName;
            this.processAnimationQueue();
        },

        clearPreview() {
            // Cancel any existing timeout
            if (this.clearPreviewTimeout) {
                clearTimeout(this.clearPreviewTimeout);
            }

            // Delay clearing to handle gaps between list items
            this.clearPreviewTimeout = setTimeout(() => {
                this.targetPreview = null;
                this.processAnimationQueue();
                this.clearPreviewTimeout = null;
            }, 150); // 150ms delay before clearing
        },

        processAnimationQueue() {
            // If already animating, the current animation will check the queue when done
            if (this.isAnimating) return;

            // If we're already at the target, nothing to do
            if (this.currentPreview === this.targetPreview) return;

            const card = document.querySelector(".flip-card");
            if (!card) return;

            this.isAnimating = true;

            const from = this.currentPreview;
            const to = this.targetPreview;

            // Case 1: From one preview to another preview (360° spin)
            if (from !== null && to !== null) {
                card.classList.remove(
                    "flip-animation",
                    "flip-back-animation",
                    "spin-360-animation"
                );
                void card.offsetWidth;

                card.classList.add("spin-360-animation");

                // Update content at midpoint
                setTimeout(() => {
                    this.currentPreview = to;
                }, 400);

                setTimeout(() => {
                    card.classList.remove("spin-360-animation");
                    card.style.transform = "rotateY(180deg)";

                    setTimeout(() => {
                        card.style.transform = "";
                        this.isAnimating = false;
                        // Check if target changed during animation
                        this.processAnimationQueue();
                    }, 50);
                }, 800);
            }
            // Case 2: From default to preview (flip forward)
            else if (from === null && to !== null) {
                card.classList.remove(
                    "flip-animation",
                    "flip-back-animation",
                    "spin-360-animation"
                );
                void card.offsetWidth;

                card.classList.add("flip-animation");
                this.currentPreview = to;
                this.isFlipped = true;

                setTimeout(() => {
                    card.classList.remove("flip-animation");
                    this.isAnimating = false;
                    // Check if target changed during animation
                    this.processAnimationQueue();
                }, 800);
            }
            // Case 3: From preview to default (flip back)
            else if (from !== null && to === null) {
                card.classList.remove(
                    "flip-animation",
                    "flip-back-animation",
                    "spin-360-animation"
                );
                void card.offsetWidth;

                card.classList.add("flip-back-animation");
                this.isFlipped = false; // Set immediately, just like Case 2

                setTimeout(() => {
                    card.classList.remove("flip-back-animation");
                    this.currentPreview = null; // Clear content after animation
                    this.isAnimating = false;
                    this.processAnimationQueue();
                }, 800);
            }
        },

        setupBobVideos() {
            this.teardownBobVideos();

            const modal = document.querySelector('section[data-modal="bob"]');
            if (!modal) {
                return;
            }

            const videos = Array.from(
                modal.querySelectorAll("video[data-bob-video]")
            );

            if (!videos.length) {
                return;
            }

            const loadVideo = (video) => {
                if (video.dataset.loaded === "true") {
                    return;
                }

                const source = video.dataset.src;
                if (!source) {
                    return;
                }

                video.src = source;
                video.load();
                video.dataset.loaded = "true";
            };

            const playVideo = (video) => {
                if (video.dataset.autoplay !== "true") {
                    return;
                }

                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(() => {});
                }
            };

            const pauseVideo = (video) => {
                if (!video.paused) {
                    video.pause();
                }
            };

            if (!("IntersectionObserver" in window)) {
                videos.forEach((video) => {
                    loadVideo(video);
                    playVideo(video);
                });

                this.bobVideoElements = videos;
                return;
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const video = entry.target;
                        if (entry.isIntersecting) {
                            loadVideo(video);
                            playVideo(video);
                        } else {
                            pauseVideo(video);
                        }
                    });
                },
                {
                    root: modal,
                    rootMargin: "15% 0px",
                    threshold: 0.35,
                }
            );

            videos.forEach((video) => {
                if (video.dataset.priority === "true") {
                    loadVideo(video);
                    playVideo(video);
                }

                observer.observe(video);
            });

            this.bobVideoObserver = observer;
            this.bobVideoElements = videos;
        },

        teardownBobVideos() {
            if (this.bobVideoObserver) {
                this.bobVideoObserver.disconnect();
                this.bobVideoObserver = null;
            }

            if (!this.bobVideoElements || !this.bobVideoElements.length) {
                this.bobVideoElements = [];
                return;
            }

            this.bobVideoElements.forEach((video) => {
                video.pause();

                if (video.dataset.src) {
                    video.removeAttribute("src");
                    video.load();
                    video.dataset.loaded = "";
                }
            });

            this.bobVideoElements = [];
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
                        
                        // Ocean abyss palette with turquoise and cyan
                        vec3 color1 = vec3(0.01, 0.08, 0.12);  // Deep teal-black
                        vec3 color2 = vec3(0.03, 0.18, 0.25);  // Dark turquoise-blue
                        vec3 color3 = vec3(0.08, 0.32, 0.42);  // Deep teal
                        vec3 color4 = vec3(0.15, 0.48, 0.58);  // Ocean turquoise
                        vec3 color5 = vec3(0.28, 0.68, 0.75);  // Bright turquoise
                        vec3 color6 = vec3(0.45, 0.85, 0.88);  // Light cyan
                        
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
            if (!title) {
                return;
            }

            const finalText = "Emily Yobal";

            title.innerHTML = "";
            title.style.display = "inline-block";
            title.style.position = "relative";
            title.style.whiteSpace = "nowrap";

            const fragment = document.createDocumentFragment();

            finalText.split("").forEach((char, index) => {
                const span = document.createElement("span");
                span.className = "char";
                span.textContent = char === " " ? "\u00a0" : char;
                span.style.display = "inline-block";
                span.style.padding = "0 0.04em";
                span.style.minWidth = char === " " ? "0.4em" : "auto";
                span.style.transformOrigin = "50% 100%";
                fragment.appendChild(span);
            });

            title.appendChild(fragment);

            const charElements = Array.from(title.querySelectorAll(".char"));

            gsap.set(charElements, {
                opacity: 0,
                yPercent: 60,
                scale: 0.92,
                filter: "blur(10px)",
                color: "#8f8f91",
            });

            const tl = gsap.timeline({ delay: 0.4 });

            const letterDelay = 0.09;

            charElements.forEach((charEl, index) => {
                const startTime = index * letterDelay;

                tl.to(
                    charEl,
                    {
                        opacity: 1,
                        yPercent: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        color: "#ffffff",
                        textShadow: "0 0 22px rgba(255, 255, 255, 0.35)",
                        duration: 0.38,
                        ease: "power3.out",
                    },
                    startTime
                );

                tl.to(
                    charEl,
                    {
                        textShadow: "0 0 0 rgba(0,0,0,0)",
                        duration: 0.5,
                        ease: "sine.inOut",
                    },
                    startTime + 0.38
                );
            });
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
        this.teardownBobVideos();

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
