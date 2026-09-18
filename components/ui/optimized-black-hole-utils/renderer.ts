import { kerrHorizonRs, kerrIscoRs } from "./physics";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export interface BlackHoleParams {
  /** Dimensionless spin a*, 0 (Schwarzschild) to ~0.998 (near-extremal Kerr). */
  spin: number;
  /** Accretion disk temperature multiplier; 1 is the reference palette. */
  diskTemperature: number;
  /** Viewing inclination in degrees: 0 = face-on, 90 = edge-on. */
  inclination: number;
  /** Relativistic Doppler beaming and colour shift of the disk. */
  dopplerBeaming: boolean;
  /** Light-bending strength; 1 is general relativity, 0 disables lensing. */
  lensing: number;
}

export interface Framing {
  /** Vertical shift of the hole, in units of the viewport's shorter side (+ = up). */
  offsetY?: number;
  /** Focal-length multiplier; < 1 zooms out. */
  zoom?: number;
  /** On portrait screens, lift the hole to leave room for copy below (default true). */
  portraitLift?: boolean;
}

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  /** Upper bound for devicePixelRatio used for the drawing buffer. */
  maxPixelRatio?: number;
  /** Initial fraction of the CSS-pixel resolution to render at (0.35–1). */
  renderScale?: number;
  /** Let the user orbit the camera by dragging. */
  interactive?: boolean;
  /** Slowly orbit the camera when idle. */
  autoOrbit?: boolean;
  params?: Partial<BlackHoleParams>;
  framing?: Framing;
}

export interface BlackHoleRenderer {
  /** Resolves once the first frame has been drawn (or rendering is unavailable). */
  ready: Promise<void>;
  /** Smoothly transitions towards new physical/visual parameters. */
  setParams(params: Partial<BlackHoleParams>): void;
  setFraming(framing: Framing): void;
  setAutoOrbit(enabled: boolean): void;
  dispose(): void;
}

export const DEFAULT_PARAMS: BlackHoleParams = {
  spin: 0,
  diskTemperature: 1,
  inclination: 80,
  dopplerBeaming: true,
  lensing: 1,
};

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const MIN_SCALE = 0.35;
const MAX_SCALE = 1;
const CAMERA_DISTANCE = 26;
const PITCH_LIMIT = 1.25;
const PARAM_EASE_PER_S = 2.6;
// KHR_parallel_shader_compile
const COMPLETION_STATUS_KHR = 0x91b1;

const UNIFORMS = [
  "uResolution",
  "uTime",
  "uCamPos",
  "uCamRight",
  "uCamUp",
  "uCamForward",
  "uOffsetY",
  "uZoom",
  "uSpin",
  "uHorizon",
  "uDiskInner",
  "uTemperature",
  "uDoppler",
  "uLensing",
] as const;
type UniformName = (typeof UNIFORMS)[number];

/** Continuous values the shader consumes; eased towards their targets every frame. */
interface ShaderState {
  spin: number;
  temperature: number;
  doppler: number;
  lensing: number;
  offsetY: number;
  zoom: number;
}

const inclinationToPitch = (deg: number) => ((90 - Math.min(Math.max(deg, 0), 90)) * Math.PI) / 180;

function compileShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Real-time gravitationally lensed black hole on a full-screen triangle.
 *
 * Optimizations: non-blocking shader compilation, adaptive render resolution
 * driven by frame timing, capped pixel ratio, rendering paused while the canvas
 * is off-screen or the tab is hidden, and a static frame for reduced motion.
 */
export function createRenderer({
  canvas,
  maxPixelRatio = 1.5,
  renderScale = 0.75,
  interactive = true,
  autoOrbit = true,
  params,
  framing,
}: RendererOptions): BlackHoleRenderer {
  let disposed = false;
  let rafId = 0;
  let gl: GL | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let uniforms: Record<UniformName, WebGLUniformLocation | null> | null = null;

  let scale = Math.min(Math.max(renderScale, MIN_SCALE), MAX_SCALE);
  let simTime = 0;
  let lastFrame = 0;
  let avgFrameMs = 16.7;
  let framesSinceScaleChange = 0;
  let isVisible = true;
  let needsDraw = true;
  let orbiting = autoOrbit;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reducedMotionQuery.matches;

  let target: BlackHoleParams = { ...DEFAULT_PARAMS, ...params };
  const targetFraming: Required<Framing> = { offsetY: 0, zoom: 1, portraitLift: true, ...framing };
  const toShaderTarget = (): ShaderState => ({
    spin: target.spin,
    temperature: target.diskTemperature,
    doppler: target.dopplerBeaming ? 1 : 0,
    lensing: target.lensing,
    offsetY: targetFraming.offsetY,
    zoom: targetFraming.zoom,
  });
  const current: ShaderState = toShaderTarget();

  // Camera orbit state (smoothed towards targets).
  let restPitch = inclinationToPitch(target.inclination);
  let yaw = 0.6;
  let pitch = restPitch;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };
  let lastInteraction = -Infinity;

  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const contextAttributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  };
  gl =
    (canvas.getContext("webgl2", contextAttributes) as WebGL2RenderingContext | null) ??
    (canvas.getContext("webgl", contextAttributes) as WebGLRenderingContext | null);

  function resize() {
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      needsDraw = true;
    }
  }

  async function init(): Promise<boolean> {
    if (!gl) return false;
    const ext = gl.getExtension("KHR_parallel_shader_compile");
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const prog = gl.createProgram();
    if (!prog) return false;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    // Yield to the browser while the driver compiles, instead of blocking the
    // main thread on the first status query.
    if (ext) {
      while (!disposed && !gl.getProgramParameter(prog, COMPLETION_STATUS_KHR)) {
        await nextFrame();
      }
    }
    if (disposed || gl.isContextLost()) {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return false;
    }
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(
        "[optimized-black-hole] shader link failed:",
        gl.getProgramInfoLog(prog) || gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs),
      );
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return false;
    }
    gl.detachShader(prog, vs);
    gl.detachShader(prog, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    program = prog;
    gl.useProgram(program);

    // A single oversized triangle covers the viewport without a diagonal seam.
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const locs = {} as Record<UniformName, WebGLUniformLocation | null>;
    for (const name of UNIFORMS) locs[name] = gl.getUniformLocation(program, name);
    uniforms = locs;
    return true;
  }

  function draw() {
    if (!gl || !program || !uniforms) return;
    const cp = Math.cos(pitch);
    const pos: [number, number, number] = [
      CAMERA_DISTANCE * cp * Math.cos(yaw),
      CAMERA_DISTANCE * Math.sin(pitch),
      CAMERA_DISTANCE * cp * Math.sin(yaw),
    ];
    const len = Math.hypot(pos[0], pos[1], pos[2]);
    const fwd = [-pos[0] / len, -pos[1] / len, -pos[2] / len];
    // right = normalize(cross(fwd, worldUp)), worldUp = (0, 1, 0)
    const rx = -fwd[2];
    const rz = fwd[0];
    const rl = Math.hypot(rx, rz) || 1;
    const right = [rx / rl, 0, rz / rl];
    const up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];

    const aspect = canvas.width / canvas.height;
    const portraitLift = targetFraming.portraitLift ? Math.min(Math.max((1 - aspect) * 0.7, 0), 0.4) : 0;
    // Kerr shadows barely change size with spin, and letting rays reach the true
    // r₊ (→ 0.5 rₛ) where the frame-dragging term blows up flings them back onto
    // the disk. Capture slightly inside the Schwarzschild horizon instead.
    const horizon = Math.max(kerrHorizonRs(current.spin), 0.95);
    // The bending term is Schwarzschild-like (photon orbit fixed at 1.5 rₛ), so a
    // disk edge inside ~1.3 rₛ would light up rays that are already plunging and
    // draw blobs inside the shadow. Follow the Kerr ISCO down to that floor.
    const diskInner = Math.max(kerrIscoRs(current.spin) * 0.87, 1.3);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, simTime);
    gl.uniform3fv(uniforms.uCamPos, pos);
    gl.uniform3fv(uniforms.uCamRight, right);
    gl.uniform3fv(uniforms.uCamUp, up);
    gl.uniform3fv(uniforms.uCamForward, fwd);
    gl.uniform1f(uniforms.uOffsetY, current.offsetY + portraitLift);
    gl.uniform1f(uniforms.uZoom, current.zoom);
    gl.uniform1f(uniforms.uSpin, current.spin);
    gl.uniform1f(uniforms.uHorizon, horizon);
    gl.uniform1f(uniforms.uDiskInner, diskInner);
    gl.uniform1f(uniforms.uTemperature, current.temperature);
    gl.uniform1f(uniforms.uDoppler, current.doppler);
    gl.uniform1f(uniforms.uLensing, current.lensing);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    needsDraw = false;
  }

  function adaptQuality(frameMs: number) {
    avgFrameMs = avgFrameMs * 0.94 + frameMs * 0.06;
    framesSinceScaleChange++;
    if (framesSinceScaleChange < 45) return;
    let next = scale;
    if (avgFrameMs > 24) next = scale - 0.1;
    else if (avgFrameMs < 17.5 && scale < renderScale) next = scale + 0.05;
    next = Math.min(Math.max(next, MIN_SCALE), Math.max(renderScale, MIN_SCALE));
    if (next !== scale) {
      scale = next;
      framesSinceScaleChange = 0;
      avgFrameMs = 16.7;
      resize();
    }
  }

  /** Eases shader parameters towards their targets; returns true while still moving. */
  function easeParams(dt: number) {
    const goal = toShaderTarget();
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * PARAM_EASE_PER_S);
    let moving = false;
    for (const key of Object.keys(goal) as (keyof ShaderState)[]) {
      const delta = goal[key] - current[key];
      if (Math.abs(delta) < 1e-4) {
        current[key] = goal[key];
        continue;
      }
      current[key] += delta * k;
      moving = true;
    }
    return moving;
  }

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;
    if (!isVisible || document.hidden) return;

    const animate = !reducedMotion;
    if (animate) {
      simTime += dt;
      // Gentle auto-orbit, resumed a few seconds after the user lets go.
      if (!dragging && now - lastInteraction > 2500) {
        if (orbiting) targetYaw += dt * 0.05;
        targetPitch += (restPitch - targetPitch) * Math.min(dt * 0.4, 1);
      }
    }

    if (easeParams(dt)) needsDraw = true;

    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    const dy = targetYaw - yaw;
    const dp = targetPitch - pitch;
    if (Math.abs(dy) > 1e-5 || Math.abs(dp) > 1e-5) {
      yaw += dy * ease;
      pitch += dp * ease;
      needsDraw = true;
    }

    if (animate || needsDraw) {
      draw();
      if (animate && dt > 0) adaptQuality(dt * 1000);
    }
  }

  // --- Event wiring -------------------------------------------------------

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((e) => e.isIntersecting);
      lastFrame = 0;
    },
    { threshold: 0 },
  );
  intersectionObserver.observe(canvas);

  const onVisibility = () => {
    lastFrame = 0;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onReducedMotion = (e: MediaQueryListEvent) => {
    reducedMotion = e.matches;
    needsDraw = true;
  };
  reducedMotionQuery.addEventListener("change", onReducedMotion);

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    lastInteraction = performance.now();
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    const size = Math.max(canvas.clientHeight, 1);
    targetYaw -= (dx / size) * 2.4;
    targetPitch = Math.min(Math.max(targetPitch + (dy / size) * 2.4, -PITCH_LIMIT), PITCH_LIMIT);
    lastInteraction = performance.now();
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    lastInteraction = performance.now();
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  if (interactive) {
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
  }

  const onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(rafId);
    program = null;
    buffer = null;
    uniforms = null;
  };
  const onContextRestored = () => {
    void start();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  async function start() {
    const ok = await init().catch((err) => {
      console.warn("[optimized-black-hole] init failed:", err);
      return false;
    });
    if (disposed) return;
    if (ok) {
      resize();
      draw();
      lastFrame = 0;
      rafId = requestAnimationFrame(frame);
    }
    resolveReady();
  }

  if (gl) {
    void start();
  } else {
    console.warn("[optimized-black-hole] WebGL is unavailable; rendering skipped.");
    resolveReady();
  }

  return {
    ready,
    setParams(next) {
      const inclinationChanged = next.inclination !== undefined && next.inclination !== target.inclination;
      target = { ...target, ...next };
      if (inclinationChanged) {
        restPitch = inclinationToPitch(target.inclination);
        targetPitch = restPitch;
      }
      needsDraw = true;
    },
    setFraming(next) {
      Object.assign(targetFraming, next);
      needsDraw = true;
    },
    setAutoOrbit(enabled) {
      orbiting = enabled;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionQuery.removeEventListener("change", onReducedMotion);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      program = null;
      buffer = null;
      uniforms = null;
      resolveReady();

      // Release the GPU context once the canvas has actually left the page
      // (route change). React Strict Mode and <Activity> remount onto the same,
      // still-connected <canvas>, which must keep a live context.
      const context = gl;
      setTimeout(() => {
        if (!canvas.isConnected) context?.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    },
  };
}
