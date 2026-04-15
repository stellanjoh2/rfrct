/** Fullscreen triangle vertex — shared with main pass. */
export const BLOOM_VERT = `#version 300 es
precision highp float;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * Dreams-style threshold is meant for HDR (linear luminance can exceed 1).
 * LDR framebuffer: boost luminance before the threshold so highlights still
 * feed the bloom buffer; otherwise strength/radius barely change the image.
 */
export const BLOOM_FRAG_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_softKnee;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 s = texture(u_scene, uv);
  /** Premultiply so transparent pixels do not leak bloom. */
  vec3 c = s.rgb * s.a;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float L = lum * 2.05;
  float thresh = max(0.001, u_threshold);
  float knee = max(0.02, u_softKnee);
  float rq = max(0.0, L - thresh);
  float soft = rq * rq / (4.0 * knee + 1e-4);
  vec3 bright = c * (soft / max(lum, 1e-4));
  fragColor = vec4(bright, 1.0);
}
`;

/**
 * Kawase-style box blur (4 taps, offset in pixels). Multi-pass at full resolution
 * avoids separable-Gaussian striations and fixed 9-tap banding at large radii.
 */
export const BLOOM_FRAG_KAWASE = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_offsetPx;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 px = vec2(1.0) / u_resolution;
  vec2 d = px * u_offsetPx;
  vec3 c =
    texture(u_tex, uv + vec2(-d.x, -d.y)).rgb +
    texture(u_tex, uv + vec2(d.x, -d.y)).rgb +
    texture(u_tex, uv + vec2(-d.x, d.y)).rgb +
    texture(u_tex, uv + vec2(d.x, d.y)).rgb;
  fragColor = vec4(c * 0.25, 1.0);
}
`;

export const BLOOM_FRAG_COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform vec2 u_resolution;
uniform float u_strength;
/** 1 = opaque canvas output; 0 = preserve scene alpha (YouTube / transparent backdrop). */
uniform float u_opaqueOutput;
uniform float u_globalHueShift;
out vec4 fragColor;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 hueShiftRgbPreserveNeutrals(vec3 rgb, float degrees) {
  if (abs(degrees) < 0.001) {
    return rgb;
  }
  vec3 hsv = rgb2hsv(clamp(rgb, 0.0, 1.0));
  if (hsv.y < 1.0e-4) {
    return rgb;
  }
  hsv.x = fract(hsv.x + degrees / 360.0);
  return hsv2rgb(hsv);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 sc = texture(u_scene, uv);
  vec3 bloom = texture(u_bloom, uv).rgb;
  vec3 rgb = hueShiftRgbPreserveNeutrals(sc.rgb + bloom * u_strength, u_globalHueShift);
  float a = u_opaqueOutput > 0.5 ? 1.0 : sc.a;
  fragColor = vec4(rgb, a);
}
`;
