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
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 sc = texture(u_scene, uv);
  vec3 bloom = texture(u_bloom, uv).rgb;
  vec3 rgb = sc.rgb + bloom * u_strength;
  float a = u_opaqueOutput > 0.5 ? 1.0 : sc.a;
  fragColor = vec4(rgb, a);
}
`;
