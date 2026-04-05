/** Fullscreen triangle vertex — shared with main pass. */
export const BLOOM_VERT = `#version 300 es
precision highp float;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * Dreams (Candy Lands) defaults: strength 0.5, radius 0.2, threshold 1 (HDR).
 * LDR scene: scale luminance before threshold so threshold≈1 still picks bright whites.
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
  vec3 c = texture(u_scene, uv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float L = lum * 1.28;
  float thresh = max(0.001, u_threshold);
  float knee = max(0.02, u_softKnee);
  float rq = max(0.0, L - thresh);
  float soft = rq * rq / (4.0 * knee + 1e-4);
  vec3 bright = c * (soft / max(lum, 1e-4));
  fragColor = vec4(bright, 1.0);
}
`;

/** Separable Gaussian-ish blur (9 taps, sigma scales with uniform). */
export const BLOOM_FRAG_BLUR = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform vec2 u_direction;
uniform float u_sigma;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 px = 1.0 / u_resolution;
  vec2 dir = normalize(u_direction) * px * max(0.5, u_sigma);
  vec3 c =
    texture(u_tex, uv).rgb * 0.2270270270 +
    texture(u_tex, uv + dir * 1.3846153846).rgb * 0.3162162162 +
    texture(u_tex, uv - dir * 1.3846153846).rgb * 0.3162162162 +
    texture(u_tex, uv + dir * 3.2307692308).rgb * 0.0702702703 +
    texture(u_tex, uv - dir * 3.2307692308).rgb * 0.0702702703;
  fragColor = vec4(c, 1.0);
}
`;

export const BLOOM_FRAG_COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform vec2 u_resolution;
uniform float u_strength;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 scene = texture(u_scene, uv).rgb;
  vec3 bloom = texture(u_bloom, uv).rgb;
  fragColor = vec4(scene + bloom * u_strength, 1.0);
}
`;
