/**
 * GLSL ES 1.00 sources (valid in both WebGL1 and WebGL2 contexts).
 *
 * The fragment shader integrates light rays backwards from the camera through a
 * Schwarzschild-like metric (units where the Schwarzschild radius Rs = 1), using
 * the classic photon-orbit approximation a = -1.5 * h² * r̂ / r⁴. Spin is
 * approximated with a gravitomagnetic (frame-dragging) term plus a Kerr ISCO and
 * horizon radius computed on the CPU. Each crossing of the equatorial plane
 * samples a thin accretion disk, so primary and secondary (lensed "halo") images
 * of the disk fall out naturally.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uOffsetY;
uniform float uZoom;
uniform float uSpin;         // dimensionless a*, 0..~1
uniform float uHorizon;      // outer horizon radius (Rs units)
uniform float uDiskInner;    // inner disk edge (Rs units)
uniform float uTemperature;  // disk temperature multiplier
uniform float uDoppler;      // 0 = beaming off, 1 = physical
uniform float uLensing;      // 0 = straight rays, 1 = GR

const int MAX_STEPS = 120;
const float DISK_OUTER = 13.0;
const float ESCAPE_RADIUS = 40.0;
const float FLOW_PERIOD = 18.0;
// Disk angular momentum points along -Y (see orbitDir), so prograde spin does too.
const vec3 SPIN_AXIS = vec3(0.0, -1.0, 0.0);

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise3(p);
    p = p * 2.07 + vec3(17.1, 3.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

vec2 rotate2(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Differentially rotating turbulence. Two phase-shifted samples are cross-faded
// (flow-map style) so Keplerian shear never winds the pattern infinitely tight.
float diskTurbulence(vec2 xz, float r) {
  float omega = 2.2 / pow(r, 1.5);
  float t1 = fract(uTime / FLOW_PERIOD);
  float t2 = fract(uTime / FLOW_PERIOD + 0.5);
  vec2 q1 = rotate2(xz, -omega * t1 * FLOW_PERIOD);
  vec2 q2 = rotate2(xz, -omega * t2 * FLOW_PERIOD);
  float n1 = fbm(vec3(q1 * 1.1, r * 2.4));
  float n2 = fbm(vec3(q2 * 1.1 + 5.3, r * 2.4));
  float w = abs(t1 * 2.0 - 1.0);
  return mix(n1, n2, 1.0 - w);
}

// Cheap blackbody-ish ramp: deep ember -> orange -> warm white -> pale blue.
vec3 diskColor(float t) {
  vec3 c = mix(vec3(0.55, 0.08, 0.02), vec3(1.0, 0.42, 0.10), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.86, 0.62), smoothstep(0.35, 0.75, t));
  c = mix(c, vec3(0.78, 0.88, 1.0), smoothstep(0.75, 1.2, t));
  return c;
}

vec4 shadeDisk(vec3 p, vec3 rayDir) {
  float r = length(p.xz);
  if (r < uDiskInner || r > DISK_OUTER) return vec4(0.0);

  float edge = smoothstep(uDiskInner, uDiskInner + 0.5, r) * smoothstep(DISK_OUTER, DISK_OUTER - 5.5, r);
  float turb = diskTurbulence(p.xz, r);
  float density = edge * clamp(0.25 + 1.35 * turb * turb, 0.0, 1.4);

  // Novikov-Thorne-like temperature falloff from the inner edge.
  float x = uDiskInner / r;
  float temp = pow(x, 0.75) * pow(max(1.0 - sqrt(x) * 0.92, 0.0), 0.25) * 1.9;

  // Relativistic beaming: orbital velocity vs. direction towards the camera.
  vec3 orbitDir = normalize(vec3(-p.z, 0.0, p.x));
  float beta = clamp(sqrt(0.5 / max(r - uHorizon, 0.1)), 0.0, 0.7);
  float cosTheta = dot(orbitDir, -rayDir);
  float gamma = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gamma * (1.0 - beta * cosTheta));
  float gravShift = sqrt(max(1.0 - uHorizon / r, 0.05));
  float g = gravShift * mix(1.0, doppler, uDoppler);

  float heat = temp * uTemperature;
  vec3 col = diskColor(heat * g) * pow(g, 3.0) * (0.2 + 0.85 * heat) * pow(uTemperature, 0.6);
  return vec4(col * density * 0.75, clamp(density * 0.9, 0.0, 1.0));
}

vec3 starLayer(vec3 dir, float scale, float threshold) {
  vec3 p = dir * scale;
  vec3 id = floor(p);
  float h = hash13(id);
  if (h < threshold) return vec3(0.0);
  vec3 starPos = id + 0.2 + 0.6 * vec3(hash13(id + 11.1), hash13(id + 23.7), hash13(id + 37.3));
  float d = length(p - starPos);
  float b = exp(-d * d * 260.0) * (0.6 + 2.2 * (h - threshold) / (1.0 - threshold));
  float hue = hash13(id + 71.9);
  vec3 tint = mix(vec3(1.0, 0.78, 0.6), vec3(0.7, 0.82, 1.0), hue);
  return tint * b;
}

vec3 background(vec3 dir) {
  vec3 col = starLayer(dir, 70.0, 0.965) + starLayer(dir, 150.0, 0.975) * 0.7;
  float neb = fbm(dir * 2.6 + vec3(3.1, 1.7, 0.0));
  float band = exp(-pow(dir.y * 2.2 + 0.25 * sin(dir.x * 3.0), 2.0));
  col += vec3(0.16, 0.07, 0.28) * pow(neb, 3.0) * 0.9 * (0.3 + band);
  col += vec3(0.03, 0.06, 0.12) * band * neb;
  return col;
}

vec3 acesTonemap(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  // Normalize by the shorter side so portrait screens show the whole disk,
  // then shift the hole vertically to make room for overlaid copy.
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  uv.y -= uOffsetY;
  vec3 rayDir = normalize(uCamForward * 1.65 * uZoom + uv.x * uCamRight + uv.y * uCamUp);

  vec3 pos = uCamPos;
  vec3 vel = rayDir;
  vec3 hVec = cross(pos, vel);
  float h2 = dot(hVec, hVec);

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  bool captured = false;
  float minR = 1e3;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r = length(pos);
    minR = min(minR, r);
    if (r < uHorizon) { captured = true; break; }
    if (r > ESCAPE_RADIUS && dot(pos, vel) > 0.0) break;
    if (alpha > 0.985) break;

    // Adaptive step: fine near the hole, coarse far away.
    float dt = clamp(0.085 * r, 0.02, 2.2);
    float r3 = r * r * r;
    vec3 accel = -1.5 * h2 * pos / (r3 * r * r) * uLensing;
    // Frame dragging: twist the ray around the spin axis (ω ∝ J / r³).
    accel += cross(SPIN_AXIS * (0.35 * uSpin / r3), vel) * uLensing;
    vel += accel * dt;
    vec3 next = pos + vel * dt;

    if (pos.y * next.y < 0.0) {
      float t = pos.y / (pos.y - next.y);
      vec4 d = shadeDisk(mix(pos, next, t), normalize(vel));
      col += (1.0 - alpha) * d.rgb;
      alpha += (1.0 - alpha) * d.a;
    }
    pos = next;
  }

  if (!captured) {
    col += (1.0 - alpha) * background(normalize(vel));
  }
  // Soft glow hugging the photon sphere (1.5 Rs for a non-spinning hole).
  float photonR = 1.5 * uHorizon;
  col += (1.0 - alpha) * vec3(1.0, 0.55, 0.25) * 0.09 * exp(-max(minR - photonR, 0.0) * 2.2) * float(!captured);

  col = acesTonemap(col * 1.15);
  col = pow(col, vec3(1.0 / 2.2));

  // Vignette + dither to kill banding in the dark gradients.
  vec2 q = gl_FragCoord.xy / uResolution;
  col *= 0.35 + 0.65 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.18);
  col += (hash13(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;
