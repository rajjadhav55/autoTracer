import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  // ── Simplex 2D Noise & FBM ──────────────────────────────────────────
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,  // (3.0-sqrt(3.0))/6.0
      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
     -0.577350269189626,  // -1.0 + 2.0 * C.x
      0.024390243902439   // 1.0 / 41.0
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      total += amp * snoise(p * freq);
      freq *= 2.03;
      amp *= 0.49;
    }
    return total;
  }

  void main() {
    // Centered normalized square coordinates [-1, 1]
    vec2 st = (vUv - 0.5) * 2.0;

    // Polar coordinates
    float d = length(st);
    float angle = atan(st.y, st.x);

    // ── 1. Circular Planet Rim Geometry ─────────────────────────────
    float radius = 0.72;
    float dist = abs(d - radius);

    // Hairline thin crisp edge stroke
    float pixelSize = 2.0 / min(u_resolution.x, u_resolution.y);
    float hairline = smoothstep(pixelSize * 1.6, 0.0, dist);

    // ── 2. Fluid Airflow & Plasma Energy Ribbon Motion ──────────────
    float t = u_time * 0.32;

    // Laminar aerodynamic airflow streamlines sweeping along the arc
    float noise1 = fbm(st * 2.4 + vec2(t * 0.16, -t * 0.12));
    float stream1 = sin(angle * 2.2 + t * 1.2 + noise1 * 3.0);
    stream1 = pow(stream1 * 0.5 + 0.5, 2.2);

    // Secondary turbulent wake eddy
    float noise2 = fbm(st * 3.6 - vec2(t * 0.2, t * 0.15));
    float stream2 = cos(angle * 4.0 - t * 0.9 + noise2 * 2.5);
    stream2 = pow(stream2 * 0.5 + 0.5, 2.0);

    // Diagonal wind drift current
    float windDraft = sin((st.x * 1.2 + st.y * 0.8) * 3.2 - t * 0.8 + noise1 * 2.0);
    windDraft = pow(windDraft * 0.5 + 0.5, 2.5);

    // Combined airflow energy flow
    float airflowIntensity = 0.35 + 0.65 * (stream1 * 0.55 + stream2 * 0.3 + windDraft * 0.15);

    // ── 3. Soft Volumetric Airflow Aura (Relay Style) ───────────────
    // Tight luminous aura hugging the hairline
    float tightAura = exp(-24.0 * dist) * (0.7 + 0.4 * stream1);

    // Soft volumetric airflow diffusion
    float softFlowAura = exp(-9.0 * dist) * (0.45 + 0.55 * stream2);

    // Wide atmospheric ambient glow
    float wideGlow = exp(-3.0 * dist) * 0.32 * (0.7 + 0.3 * windDraft);

    // Combined aura
    float totalAura = tightAura * 0.95 + softFlowAura * 0.65 + wideGlow * 0.4;

    // ── 4. Color Palette: Pure Void Black & Glowing Emerald Green ───
    vec3 voidBlack = vec3(0.0, 0.0, 0.0);
    vec3 deepEmerald = vec3(0.01, 0.42, 0.18);
    vec3 neonGreen = vec3(0.0, 1.0, 0.42);       // Relay emerald-neon green
    vec3 brightLime = vec3(0.42, 1.0, 0.6);     // Airflow highlight
    vec3 hotWhiteCore = vec3(0.92, 1.0, 0.97);   // Hairline core

    // Aura gradient
    vec3 auraColor = mix(deepEmerald, neonGreen, smoothstep(0.05, 0.5, totalAura));
    auraColor = mix(auraColor, brightLime, smoothstep(0.5, 0.85, totalAura));

    // Hairline stroke color
    vec3 strokeColor = mix(neonGreen, hotWhiteCore, 0.75);

    // Final composite
    vec3 finalColor = strokeColor * hairline * (0.85 + 0.35 * airflowIntensity);
    finalColor += auraColor * totalAura * (0.75 + 0.35 * airflowIntensity);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function FluidEnergyBackground() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 1000;

    // Direct WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);

    // Scene and Fullscreen Orthographic Quad
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width * dpr, height * dpr) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation Loop
    let animationFrameId;
    const startTime = performance.now();

    const renderLoop = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      uniforms.u_time.value = elapsed;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          renderer.setSize(w, h);
          uniforms.u_resolution.value.set(w * dpr, h * dpr);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-visible pointer-events-none"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
