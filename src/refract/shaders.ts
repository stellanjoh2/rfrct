export const VERT = `#version 300 es
precision highp float;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const FRAG = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec4 u_bgColor;
uniform vec4 u_imageRect;
uniform sampler2D u_image;
uniform float u_hasImage;

uniform vec2 u_blobCenter;
uniform float u_blobRadius;
uniform float u_waveFreq;
uniform float u_waveAmp;
uniform float u_time;
uniform float u_refractStrength;
uniform float u_edgeSoftness;
uniform float u_frostBlur;
uniform float u_blurQuality;

uniform float u_chroma;

out vec4 fragColor;

const float BLUR_W5[5] = float[](
  0.0625, 0.25, 0.375, 0.25, 0.0625
);
const float BLUR_W7[7] = float[](
  0.015625, 0.09375, 0.234375, 0.3125, 0.234375, 0.09375, 0.015625
);

float blobSdf(vec2 p) {
  float r = length(p);
  // atan(y,x) jumps by 2π across the negative-x axis. sin(ω*θ) is continuous across
  // that cut only when ω is an integer; non-integer ω (e.g. 4.5) causes a hard seam
  // (horizontal "pinch" through the blob). Use integer modes for the polar term,
  // plus a smooth Cartesian ripple for the fractional part.
  float ang = atan(p.y, p.x);
  float wInt = round(u_waveFreq);
  float wFrac = u_waveFreq - wInt;
  float wobble = u_waveAmp * sin(wInt * ang + u_time);
  wobble += u_waveAmp * wFrac * 0.45 * sin(dot(p, vec2(3.2, 2.7)) + u_time * 0.85);
  float boundary = u_blobRadius + wobble;
  return r - boundary;
}

vec2 sdfGradient(vec2 p) {
  float e = 0.0012;
  float a = blobSdf(p);
  float gx = blobSdf(p + vec2(e, 0.0)) - blobSdf(p - vec2(e, 0.0));
  float gy = blobSdf(p + vec2(0.0, e)) - blobSdf(p - vec2(0.0, e));
  return vec2(gx, gy) / (2.0 * e);
}

vec3 sampleScene(vec2 uv) {
  if (u_hasImage < 0.5) {
    return u_bgColor.rgb;
  }
  vec2 local = (uv - u_imageRect.xy) / u_imageRect.zw;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
    return u_bgColor.rgb;
  }
  vec4 tex = texture(u_image, local);
  return mix(u_bgColor.rgb, tex.rgb, tex.a);
}

vec3 blurBinomial3x3(vec2 uv, vec2 s) {
  vec3 acc = sampleScene(uv) * (4.0 / 16.0);
  acc += sampleScene(uv + vec2(s.x, 0.0)) * (2.0 / 16.0);
  acc += sampleScene(uv - vec2(s.x, 0.0)) * (2.0 / 16.0);
  acc += sampleScene(uv + vec2(0.0, s.y)) * (2.0 / 16.0);
  acc += sampleScene(uv - vec2(0.0, s.y)) * (2.0 / 16.0);
  acc += sampleScene(uv + vec2(s.x, s.y)) * (1.0 / 16.0);
  acc += sampleScene(uv + vec2(-s.x, s.y)) * (1.0 / 16.0);
  acc += sampleScene(uv + vec2(s.x, -s.y)) * (1.0 / 16.0);
  acc += sampleScene(uv + vec2(-s.x, -s.y)) * (1.0 / 16.0);
  return acc;
}

vec3 blurBinomial5x5(vec2 uv, vec2 s) {
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 5; j++) {
    for (int i = 0; i < 5; i++) {
      vec2 o = vec2(float(i - 2), float(j - 2)) * s;
      acc += sampleScene(uv + o) * BLUR_W5[i] * BLUR_W5[j];
    }
  }
  return acc;
}

vec3 blurBinomial7x7(vec2 uv, vec2 s) {
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 7; j++) {
    for (int i = 0; i < 7; i++) {
      vec2 o = vec2(float(i - 3), float(j - 3)) * s;
      acc += sampleScene(uv + o) * BLUR_W7[i] * BLUR_W7[j];
    }
  }
  return acc;
}

/** Separable binomial kernels; weights sum to 1. u_blurQuality: 1=9 taps, 2=25, 3=49 (cap for perf). */
vec3 sampleSceneBlurred(vec2 uv, float blurPx) {
  vec3 sharp = sampleScene(uv);
  if (blurPx < 0.001) {
    return sharp;
  }
  vec2 s = blurPx * 1.1 / u_resolution;
  vec3 blurred;
  if (u_blurQuality < 1.5) {
    blurred = blurBinomial3x3(uv, s);
  } else if (u_blurQuality < 2.5) {
    blurred = blurBinomial5x5(uv, s);
  } else {
    blurred = blurBinomial7x7(uv, s);
  }
  float t = smoothstep(0.0, 1.25, blurPx);
  return mix(sharp, blurred, t);
}

vec3 sampleSceneChroma(vec2 uv, float spread, float frostPx) {
  if (u_chroma <= 0.0001) {
    return sampleSceneBlurred(uv, frostPx);
  }
  float a = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 off = vec2(spread / u_resolution.x, spread / u_resolution.y) * a;
  float r = sampleSceneBlurred(uv + vec2(off.x, 0.0), frostPx).r;
  float g = sampleSceneBlurred(uv, frostPx).g;
  float b = sampleSceneBlurred(uv - vec2(off.x, 0.0), frostPx).b;
  return vec3(r, g, b);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - u_blobCenter) * aspect;

  float sdf = blobSdf(p);
  vec2 g = sdfGradient(p);
  float glen = length(g);
  vec2 n = glen > 1e-5 ? g / glen : vec2(0.0);

  // Single edge band: softness + fwidth AA. Refraction and frost both key off this width.
  float aa = max(fwidth(sdf), 1e-6);
  float edgeW = max(u_edgeSoftness, aa * 2.25);
  float lens = smoothstep(edgeW, -edgeW, sdf);

  vec2 refr = n.xy;
  refr.x /= aspect.x;

  float falloff = lens * (0.35 + 0.65 * smoothstep(-u_blobRadius * 0.35, 0.0, sdf));
  vec2 distort = refr * u_refractStrength * falloff;

  vec2 uvR = uv + distort;

  // Frost: same edgeW as silhouette, but outer ramp extends when frost is high so blur
  // feathers the transition (no second hard ring). No extra “glow” — only blurred samples.
  float frostOuter = edgeW * (1.0 + 0.32 * clamp(u_frostBlur, 0.0, 14.0));
  float frostBlend = smoothstep(frostOuter, -edgeW, sdf);
  float frostPx = u_frostBlur * frostBlend;
  vec3 col = sampleSceneChroma(uvR, u_chroma * falloff * 48.0, frostPx);

  fragColor = vec4(col, 1.0);
}
`;
