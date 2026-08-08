/**
 * The water background's GLSL and palettes.
 *
 * This file is deliberately written as plain JavaScript that happens to be
 * valid TypeScript: the standalone single-file build reads it directly so the
 * site and that build cannot drift apart on the part that actually matters.
 * Keep type annotations out of it.
 */

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/**
 * Caustics are the cheap, well-worn iterative-distortion trick rather than a
 * real light transport: five rounds of folding a point back through sin and cos
 * of itself, which lands very close to the bright web of light on a pool floor
 * for a handful of instructions. The swell underneath it is two slow sine waves
 * crossing at an angle, which is what keeps the pattern from reading as a
 * static texture with a shimmer bolted on.
 */
export const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform float uIntensity;

float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.0045;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

void main() {
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vec2(vUv.x * aspect, vUv.y);
  float t = uTime * 0.28;

  // Slow crossing swell, used both to tint the water and to drag the caustics
  // around so they are not pinned to the screen.
  float swell =
    sin(uv.x * 2.6 + t * 0.9) * 0.5 +
    sin(uv.y * 1.9 - t * 0.7) * 0.35 +
    sin((uv.x + uv.y) * 1.3 + t * 0.5) * 0.25;

  vec3 base = mix(uBottom, uTop, clamp(vUv.y + swell * 0.05, 0.0, 1.0));

  float c1 = caustic(uv * 0.85 + vec2(swell * 0.02, 0.0), t);
  float c2 = caustic(uv * 1.45 - vec2(0.0, t * 0.03), t * 1.3);
  float light = c1 * 0.65 + c2 * 0.35;

  // Softened toward the middle of the page so the caustics stay in the margins
  // and never sit directly under a paragraph of body text.
  float centre = smoothstep(0.0, 0.55, abs(vUv.x - 0.5) * 2.0);
  float veil = mix(0.45, 1.0, centre);

  vec3 col = base + uGlow * light * uIntensity * veil;

  // A little depth at the bottom of the frame, as though looking down.
  col *= 1.0 - 0.12 * smoothstep(0.55, 0.0, vUv.y);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Palettes, as linear-ish 0..1 RGB, tuned to sit under text without fighting it. */
export const WATER_THEMES = {
  light: {
    top: [0.898, 0.933, 0.973],
    bottom: [0.792, 0.867, 0.933],
    glow: [1.0, 1.0, 1.0],
    intensity: 0.5,
  },
  dark: {
    top: [0.055, 0.094, 0.141],
    bottom: [0.031, 0.063, 0.102],
    glow: [0.353, 0.639, 0.851],
    intensity: 0.55,
  },
};
