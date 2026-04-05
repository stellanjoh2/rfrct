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
/** 0 = wobbly blob, 1 = rotating 3D box SDF (slice at z=0), 2 = smooth metaballs */
uniform int u_shapeMode;

out vec4 fragColor;

const float BLUR_W5[5] = float[](
  0.0625, 0.25, 0.375, 0.25, 0.0625
);
const float BLUR_W7[7] = float[](
  0.015625, 0.09375, 0.234375, 0.3125, 0.234375, 0.09375, 0.015625
);

vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float blobSdf(vec2 p) {
  float r = length(p);
  float wInt = round(u_waveFreq);
  float wFrac = u_waveFreq - wInt;
  // Integer polar modes: sin(w·θ+t) without atan — avoids a fixed screen seam on negative-x.
  float rr = max(r, 1e-5);
  vec2 c = vec2(p.x / rr, p.y / rr);
  int wi = int(clamp(wInt, 1.0, 16.0));
  vec2 z = vec2(1.0, 0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= wi) break;
    z = cmul(z, c);
  }
  vec2 eit = vec2(cos(u_time), sin(u_time));
  vec2 wv = cmul(z, eit);
  float wobble = u_waveAmp * wv.y;
  wobble += u_waveAmp * wFrac * 0.45 * sin(dot(p, vec2(3.2, 2.7)) + u_time * 0.85);
  float boundary = u_blobRadius + wobble;
  return r - boundary;
}

mat3 rot3X(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}
mat3 rot3Y(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}
mat3 rot3Z(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
}

/** Exact box SDF has strong gradient seams (face/edge Voronoi); rounded box removes the “cross” on z-slices. */
float sdRoundBox3(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float cubeSdf(vec2 p) {
  float h = u_blobRadius * 0.92;
  float cornerR = h * 0.1;
  vec3 b = vec3(h - cornerR);
  vec3 p3 = vec3(p.x, p.y, 0.0);
  float t = u_time;
  // Precession: slowly rotates the spin frame so the z=0 slice does not sit in a symmetric “top” pose.
  mat3 precess = rot3Z(t * 0.19) * rot3X(t * 0.14) * rot3Y(t * 0.11);
  // Body spin: three incommensurate rates so motion does not repeat on a short cycle.
  mat3 spin = rot3Z(t * 1.03) * rot3Y(t * 0.67) * rot3X(t * 0.89);
  mat3 R = precess * spin;
  p3 = R * p3;
  return sdRoundBox3(p3, b, cornerR);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float metaballsSdf(vec2 p) {
  float R = u_blobRadius;
  float orbit = R * 0.5;
  float ballR = R * 0.36;
  float blend = R * 0.28;
  float t = u_time;
  float d = 1e6;
  const int N = 4;
  for (int i = 0; i < N; i++) {
    float ang = float(i) * (6.28318530718 / float(N)) + t * 0.85;
    vec2 c = vec2(cos(ang), sin(ang)) * orbit;
    float di = length(p - c) - ballR;
    d = smin(d, di, blend);
  }
  float dc = length(p) - ballR * 0.62;
  d = smin(d, dc, blend * 0.75);
  return d;
}

float shapeSdf(vec2 p) {
  if (u_shapeMode == 0) {
    return blobSdf(p);
  }
  if (u_shapeMode == 1) {
    return cubeSdf(p);
  }
  return metaballsSdf(p);
}

vec2 sdfGradient(vec2 p) {
  float e = 0.0012 * max(u_blobRadius, 0.08);
  float gx = shapeSdf(p + vec2(e, 0.0)) - shapeSdf(p - vec2(e, 0.0));
  float gy = shapeSdf(p + vec2(0.0, e)) - shapeSdf(p - vec2(0.0, e));
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

  float sdf = shapeSdf(p);
  vec2 g = sdfGradient(p);
  float core = smoothstep(0.0, u_blobRadius * 0.045 + 1e-6, length(p));
  g *= core;
  float glen = length(g);
  vec2 n = glen > 1e-4 ? g / glen : vec2(0.0);

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
