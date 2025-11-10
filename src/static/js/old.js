
        // initBackground() {
        //     // Initialize Three.js scene
        //     this.scene = markRaw(new THREE.Scene());

        //     // Setup camera
        //     this.camera = markRaw(
        //         new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        //     );

        //     // Setup renderer
        //     const canvas = document.getElementById("bg-canvas");
        //     this.renderer = markRaw(
        //         new THREE.WebGLRenderer({
        //             canvas: canvas,
        //             alpha: false,
        //             antialias: false,
        //             powerPreference: "high-performance",
        //         })
        //     );

        //     this.renderer.setSize(this.canvasWidth, this.canvasHeight);
        //     this.renderer.setPixelRatio(1);

        //     // Create gradient shader material
        //     const gradientMaterial = new THREE.ShaderMaterial({
        //         uniforms: {
        //             uTime: { value: 0 },
        //             uResolution: {
        //                 value: new THREE.Vector2(
        //                     this.canvasWidth,
        //                     this.canvasHeight
        //                 ),
        //             },
        //             uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        //             uPointerDown: { value: 0.0 },
        //         },
        //         vertexShader: `
        //             varying vec2 vUv;
        //             void main() {
        //                 vUv = uv;
        //                 gl_Position = vec4(position, 1.0);
        //             }
        //         `,
        //         fragmentShader: `
        //             uniform float uTime;
        //             uniform vec2 uResolution;
        //             uniform vec2 uPointer;
        //             uniform float uPointerDown;
        //             varying vec2 vUv;

        //             // Simplex noise functions
        //             vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        //             vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        //             vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        //             float snoise(vec2 v) {
        //                 const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        //                 vec2 i  = floor(v + dot(v, C.yy));
        //                 vec2 x0 = v - i + dot(i, C.xx);
        //                 vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        //                 vec4 x12 = x0.xyxy + C.xxzz;
        //                 x12.xy -= i1;
        //                 i = mod289(i);
        //                 vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        //                 vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        //                 m = m*m;
        //                 m = m*m;
        //                 vec3 x = 2.0 * fract(p * C.www) - 1.0;
        //                 vec3 h = abs(x) - 0.5;
        //                 vec3 ox = floor(x + 0.5);
        //                 vec3 a0 = x - ox;
        //                 m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        //                 vec3 g;
        //                 g.x  = a0.x  * x0.x  + h.x  * x0.y;
        //                 g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        //                 return 130.0 * dot(m, g);
        //             }

        //             // Soft film grain for photographic quality
        //             float filmGrain(vec2 coord, float time) {
        //                 float grain = fract(sin(dot(coord + time * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
        //                 return grain * 0.012 - 0.006;
        //             }

        //             // Generates a soft, string-like wave using a Gaussian falloff
        //             float stringWave(vec2 uv, float baseY, float thickness, float amplitude, float frequency, float phase, float t) {
        //                 float curve = sin((uv.x * frequency) + phase + t) * amplitude;
        //                 float dist = abs(uv.y - (baseY + curve));
        //                 float falloff = exp(-pow(dist / thickness, 2.0));
        //                 return falloff;
        //             }

        //             void main() {
        //                 vec2 uv = vUv;
        //                 vec2 resolution = uResolution;

        //                 // Center-based coordinates for radial effects
        //                 vec2 center = uv - 0.5;
        //                 float distFromCenter = length(center);

        //                 // Adjust UV for aspect ratio
        //                 vec2 aspectUv = uv;
        //                 float aspect = resolution.x / resolution.y;
        //                 aspectUv.x *= aspect;

        //                 // Very slow drift for subtle motion
        //                 float time = uTime * 0.05;

        //                 // Large-scale smooth noise for organic light diffusion
        //                 float noise1 = snoise(aspectUv * 0.5 + vec2(time * 0.15, time * 0.1));
        //                 float noise2 = snoise(aspectUv * 0.3 + vec2(-time * 0.1, time * 0.12));
        //                 float noise3 = snoise(aspectUv * 0.7 + vec2(time * 0.08, -time * 0.09));

        //                 // Combine noises for subtle, organic flow
        //                 float flow = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);

        //                 // Create diffused, string-like gradient waves that weave around each other
        //                 float weaveSpeed = time * 0.35;
        //                 float basePhase = uv.x * 1.6;

        //                 float base1 = 0.35 + sin(basePhase + weaveSpeed) * 0.11;
        //                 float base2 = 0.6 + sin(basePhase + weaveSpeed + 2.4) * 0.11;

        //                 float rightwardDrift = smoothstep(0.55, 1.0, uv.x);
        //                 base1 += rightwardDrift * 0.25;
        //                 base2 += rightwardDrift * 0.50;

        //                 base1 += sin(time * 0.2) * 0.01;
        //                 base2 += sin(time * 0.24 + 1.2) * 0.01;

        //                 float string1Progress = smoothstep(0.35, 1.0, uv.x);
        //                 float string1CoreThickness = mix(0.022, 0.040, string1Progress);
        //                 float string1CoreAmplitude = mix(0.048, 0.072, string1Progress);
        //                 float string1HaloThickness = mix(0.1, 0.11, string1Progress);
        //                 float string1HaloAmplitude = mix(0.10, 0.0, string1Progress);
        //                 float string1Core = stringWave(uv, base1, string1CoreThickness, string1CoreAmplitude, 6.2, 0.0, time * 0.55);
        //                 float string1Halo = stringWave(uv, base1, string1HaloThickness, string1HaloAmplitude, 6.2, 0.0, time * 0.55);

        //                 float string2Progress = smoothstep(0.0, 0.55, uv.x);
        //                 float string2CoreThickness = mix(0.4, 0.04, string2Progress);
        //                 float string2CoreAmplitude = mix(0.228, 0.074, string2Progress);
        //                 float string2HaloThickness = mix(0.8, 0.25, string2Progress);
        //                 float string2HaloAmplitude = mix(0.39, 0.12, string2Progress);
        //                 float string2Core = stringWave(uv, base2, string2CoreThickness, string2CoreAmplitude, 5.6, 2.2, time * 0.5);
        //                 float string2Halo = stringWave(uv, base2, string2HaloThickness, string2HaloAmplitude, 5.6, 2.2, time * 0.5);

        //                 // Gently modulate each wave so it fades in and out over time
        //                 float stringPulse1 = smoothstep(0.0, 1.0, sin(time * 0.25 + 0.4) * 0.5 + 0.5);
        //                 float stringPulse2 = smoothstep(0.0, 1.0, sin(time * 0.3 + 1.1) * 0.5 + 0.5);

        //                 string1Core *= mix(0.42, 1.0, stringPulse1);
        //                 string1Halo *= mix(0.5, 1.0, stringPulse1);
        //                 string2Core *= mix(0.37, 1.0, stringPulse2);
        //                 string2Halo *= mix(0.45, 1.0, stringPulse2);

        //                 float string1 = mix(string1Halo, string1Core, 0.3);
        //                 float string2 = mix(string2Halo, string2Core, 0.22);

        //                 // Combine the waves, keeping them soft while allowing visible intertwining
        //                 float horizontalWaves = string1 * 0.12 + string2 * 0.115;
        //                 horizontalWaves = smoothstep(0.0, 0.12, horizontalWaves);

        //                 // Create soft, photographic gradient base
        //                 // Diagonal gradient from top-right to bottom-left
        //                 float gradientBase = (aspectUv.x * 0.4 + aspectUv.y * 0.6);

        //                 // Add radial component for bokeh-like center focus
        //                 float radialGrad = 1.0 - distFromCenter * 0.8;

        //                 // Combine with subtle noise and horizontal waves
        //                 float gradientFlow = gradientBase + flow * 0.1 + radialGrad * 0.16 + horizontalWaves * 0.35;

        //                 // Very subtle pointer interaction (light following cursor)
        //                 vec2 pointerInfluence = (uv - uPointer);
        //                 float pointerDist = length(pointerInfluence);
        //                 float pointerGlow = smoothstep(0.8, 0.0, pointerDist) * uPointerDown * 0.08;
        //                 gradientFlow += pointerGlow;

        //                 // Warm to cool color palette - photographic quality
        //                 vec3 deepNavy = vec3(0.006, 0.01, 0.028);      // Deeper navy base
        //                 vec3 darkIndigo = vec3(0.022, 0.034, 0.072);   // Dark indigo
        //                 vec3 richPurple = vec3(0.048, 0.032, 0.096);   // Rich cool purple
        //                 vec3 coolBlue = vec3(0.082, 0.098, 0.21);      // Cool blue
        //                 vec3 duskBlue = vec3(0.118, 0.13, 0.26);       // Dusk blue
        //                 vec3 mutedTeal = vec3(0.158, 0.196, 0.29);     // Muted teal
        //                 vec3 softSlate = vec3(0.196, 0.236, 0.32);     // Soft slate

        //                 // Ultra-smooth gradient transitions
        //                 vec3 finalColor;
        //                 float t = gradientFlow;

        //                 // Create seamless blending between colors
        //                 if (t < 0.15) {
        //                     finalColor = mix(deepNavy, darkIndigo, smoothstep(0.0, 0.15, t));
        //                 } else if (t < 0.35) {
        //                     finalColor = mix(darkIndigo, richPurple, smoothstep(0.15, 0.35, t));
        //                 } else if (t < 0.55) {
        //                     finalColor = mix(richPurple, coolBlue, smoothstep(0.35, 0.55, t));
        //                 } else if (t < 0.75) {
        //                     finalColor = mix(coolBlue, duskBlue, smoothstep(0.55, 0.75, t));
        //                 } else if (t < 0.9) {
        //                     finalColor = mix(duskBlue, mutedTeal, smoothstep(0.75, 0.9, t));
        //                 } else {
        //                     finalColor = mix(mutedTeal, softSlate, smoothstep(0.9, 1.05, t));
        //                 }

        //                 // Add extremely subtle color variation for depth
        //                 vec3 colorShift = vec3(
        //                     snoise(aspectUv * 1.2 + time * 0.05),
        //                     snoise(aspectUv * 1.2 + time * 0.05 + 100.0),
        //                     snoise(aspectUv * 1.2 + time * 0.05 + 200.0)
        //                 ) * 0.012;

        //                 finalColor += colorShift;

        //                 // Very subtle brightness variation for light diffusion
        //                 float lightDiffusion = 1.0 + (noise1 * 0.04 + noise2 * 0.03);
        //                 finalColor *= lightDiffusion;

        //                 // Bokeh-style soft highlights in warm areas
        //                 float bokehHighlight = smoothstep(0.6, 0.9, t) * 0.08;
        //                 finalColor += bokehHighlight * 0.6;

        //                 // Subtle warm glow along the diffused string waves
        //                 vec3 stringColor1 = vec3(0.96, 0.55, 0.16);  // warm orange
        //                 vec3 stringColor2 = vec3(1.0, 0.12, 0.04);   // vivid red-orange

        //                 float string1ColorStrength = string1Core * 0.78 + string1Halo * 0.42;
        //                 float string2ColorStrength = string2Core * 0.88 + string2Halo * 0.48;

        //                 float string2Alpha = clamp(string2ColorStrength * 0.48, 0.0, 1.0);
        //                 float string1Alpha = clamp(string1ColorStrength * 0.58, 0.0, 1.0);

        //                 vec3 layeredColor = finalColor;
        //                 layeredColor = mix(layeredColor, stringColor2, min(0.44, string2Alpha));
        //                 layeredColor = mix(layeredColor, stringColor1, min(0.5, string1Alpha));

        //                 vec3 stringLight =
        //                     string2Core * stringColor2 * 0.12 +
        //                     string2Halo * stringColor2 * 0.07 +
        //                     string1Core * stringColor1 * 0.15 +
        //                     string1Halo * stringColor1 * 0.09;

        //                 finalColor = layeredColor + stringLight;

        //                 // Photographic film grain
        //                 float grain = filmGrain(gl_FragCoord.xy, uTime);
        //                 finalColor += grain;

        //                 // Soft vignette for lens-like focus
        //                 float vignette = 1.0 - pow(distFromCenter * 1.2, 1.8);
        //                 vignette = smoothstep(0.0, 1.0, vignette);
        //                 finalColor *= vignette;

        //                 // Very subtle edge darkening for photographic quality
        //                 float edgeDarken = 1.0 - pow(distFromCenter, 3.2) * 0.3;
        //                 finalColor *= edgeDarken;

        //                 gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
        //             }
        //         `,
        //     });

        //     // Create full-screen quad
        //     const geometry = new THREE.PlaneGeometry(2, 2);
        //     const mesh = markRaw(new THREE.Mesh(geometry, gradientMaterial));
        //     this.scene.add(mesh);

        //     this.gradientTexture = gradientMaterial;

        //     // Setup event handlers
        //     this.setupEventHandlers();

        //     // Start animation loop
        //     this.animate();
        // },
