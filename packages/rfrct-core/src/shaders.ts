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
/** Optional second bitmap (e.g. hero flash), same letterbox as u_image; sampled at distorted UV. */
uniform sampler2D u_underlay;
uniform float u_underlayActive;
uniform float u_underlayOpacity;
/** Local-cell contain-fit: offset (xy) and size (zw) in 0–1 cell space (origin bottom-left). */
uniform vec4 u_underlayCell;
/** Multiply underlay (PNG) rgb after sample; default (1,1,1) = unchanged. */
uniform vec3 u_underlayTintRgb;
/** Optional second SVG / bitmap **on top** of the main logo (same letterbox). */
uniform sampler2D u_overlayLayer;
uniform float u_overlayLayerActive;
uniform float u_overlayOpacity;
uniform vec4 u_overlayCell;
/** 0 = original, 1 = multiply tint rgb, 2 = replace with tint rgb. */
uniform float u_overlayTintMode;
uniform vec3 u_overlayTintRgb;
/** 0 normal, 1 multiply, 2 screen, 3 add, 4 overlay, 5 difference. */
uniform int u_overlayBlendMode;
/** 1 = sample using distorted UV (uvR); 0 = undistorted screen UV (uv). */
uniform float u_overlayFollowDistort;
/** 1 = scene composites over a transparent canvas (e.g. YouTube behind); enables RGBA output. */
uniform float u_transparentSceneBg;
/** VJ: tile & scroll logo texture vertically in image UV (0/1). */
uniform float u_vjDupVertical;
/** Uploaded texture width ÷ height (non-dup / fallback). */
uniform float u_texAspect;
/** Extra vertical gap between rows (normalized viewport height, 0 = edge-to-edge). */
uniform float u_vjDupGap;
/** Horizontal offset per stair step (normalized viewport width); applied to mod(row, 8). */
uniform float u_vjDupHorizStep;
/** Independent scroll phase for dup stack (not tied to lens/blob time). */
uniform float u_vjDupScrollTime;
/** Horizontal dup scroll phase (viewport-normalized; can be negative). */
uniform float u_vjDupScrollTimeX;
/** One logo’s contain-fit size in normalized viewport UV (from image rect). */
uniform float u_vjSpanH;
uniform float u_vjSpanW;
uniform float u_vjCenterX;
/** Bottom edge of the reference logo row (normalized), for tiling origin. */
uniform float u_vjAnchorY;

uniform vec2 u_blobCenter;
uniform float u_blobRadius;
uniform float u_waveFreq;
uniform float u_waveAmp;
uniform float u_time;
uniform float u_refractStrength;
uniform float u_edgeSoftness;
uniform float u_frostBlur;
uniform float u_blurQuality;
/** Degrees — applied to final RGB after lens grade (matches bloom composite). */
uniform float u_globalHueShift;

uniform float u_chroma;
/** 0 = blob, 1 = rotating 3D box SDF, 2 = metaballs, 3 = water, 4 = vertical reeds, 5 = horizontal reeds */
uniform int u_shapeMode;

/** 0 = none, 1 = horizontal reeds, 2 = bullseye, 3 = speckle, 4 = halftone dots, 5 = vertical reeds, 6 = pixels uniform, 7 = pixels random, 8 = bubbles, 9 = dots, 10 = cross fluted */
uniform int u_filterMode;
uniform float u_filterStrength;
/** 0 = finest features, 1 = coarsest (all modes use the same convention in filterGlass). */
uniform float u_filterScale;
uniform float u_filterMotionSpeed;

/**
 * 0 = none, 1 = multiply solid, 2 = replace solid, 3 = multiply gradient, 4 = replace gradient.
 * SVG uploads only.
 */
uniform float u_svgTintMode;
uniform vec3 u_svgTintRgb;
uniform vec3 u_svgGradientRgb2;
uniform vec3 u_svgGradientRgb3;
/** 2 or 3 stops. */
uniform float u_svgGradientStops;
/** Radians — 0 = up (+v), π/2 = right (+u), CSS linear-gradient angles. */
uniform float u_svgGradientAngle;
/** 1 = default; values below 1 pinch toward centre; above 1 softer / wider (Photoshop-like). */
uniform float u_svgGradientScale;
/** Slide along gradient axis (logo UV space). */
uniform float u_svgGradientOffset;

/** 0 = off, 1 = hard neon tint on glass, 2 = duotone (rgbB → rgbA by luma). */
uniform int u_glassGradeMode;
uniform vec3 u_glassNeonA;
uniform vec3 u_glassNeonB;
uniform float u_glassGradeStrength;

/** Normal map (tangent-space RGB); XY perturbs UV for high-frequency lens distortion. */
uniform sampler2D u_detailNormal;
/** 0 = off; otherwise scales XY displacement (combined with lens mask in shader). */
uniform float u_detailDistortAmp;
/** Screen-UV tiling of the normal map (higher = smaller features). */
uniform float u_detailDistortScale;
/** 0–1: multiply stain in recesses (derived from same normal sample). */
uniform float u_detailDirtStrength;
uniform vec3 u_detailDirtRgb;

out vec4 fragColor;

const float BLUR_W5[5] = float[](
  0.0625, 0.25, 0.375, 0.25, 0.0625
);
const float BLUR_W7[7] = float[](
  0.015625, 0.09375, 0.234375, 0.3125, 0.234375, 0.09375, 0.015625
);
const float BLUR_W11[11] = float[](
  0.0009765625, 0.009765625, 0.0439453125, 0.1171875, 0.205078125, 0.24609375, 0.205078125, 0.1171875, 0.0439453125, 0.009765625, 0.0009765625
);
const float BLUR_W15[15] = float[](
  0.00006103515625, 0.0008544921875, 0.005554199219, 0.02221679688, 0.06109619141, 0.1221923828, 0.1832885742, 0.2094726563, 0.1832885742, 0.1221923828, 0.06109619141, 0.02221679688, 0.005554199219, 0.0008544921875, 0.00006103515625
);
const float BLUR_W23[23] = float[](
  0.0000002384185791, 0.0000052452087402, 0.0000550746917725, 0.0003671646118164, 0.0017440319061279, 0.0062785148620605, 0.0177891254425049, 0.0406608581542969, 0.0762391090393066, 0.1185941696166992, 0.1541724205017090, 0.1681880950927734, 0.1541724205017090, 0.1185941696166992, 0.0762391090393066, 0.0406608581542969, 0.0177891254425049, 0.0062785148620605, 0.0017440319061279, 0.0003671646118164, 0.0000550746917725, 0.0000052452087402, 0.0000002384185791
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
  // Edge bevel: a bit more corner radius than before (~0.1) so facets meet less harshly on the z-slice.
  float cornerR = h * 0.13;
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

/**
 * Water lens: smooth functions only (no atan2 — avoids branch-cut seam).
 * Layered swell / rollers / chop with deep-water-style dispersion ω ∝ √k so long
 * waves roll slowly and short ripples shimmer faster (see dispersion of surface waves).
 */
float waterSdf(vec2 p) {
  float r = length(p);
  float R = u_blobRadius;
  float t = u_time;
  float a = u_waveAmp;
  float wf = clamp(u_waveFreq, 1.0, 16.0);
  float wfN = (wf - 1.0) / 15.0;

  vec2 d0 = normalize(vec2(0.82, 0.57));
  vec2 d1 = normalize(vec2(-0.61, 0.79));
  vec2 d2 = normalize(vec2(0.45, -0.89));
  vec2 d3 = normalize(vec2(0.93, -0.37));
  vec2 d4 = normalize(vec2(0.28, 0.96));

  // --- Swell: long wavelength (low k), slow rolling ---
  float kSwell = 2.2 + wf * 0.28;
  float wSwell = sqrt(max(kSwell, 0.15)) * 1.1;
  float s0 = a * 0.95 * sin(dot(p, d0) * kSwell - t * wSwell);
  float s1 = a * 0.82 * sin(dot(p, d1) * kSwell * 0.88 + t * wSwell * 0.94);

  // --- Mid rollers: traveling across the lens ---
  float kMid = 5.5 + wf * 0.62;
  float wMid = sqrt(max(kMid, 0.2)) * 1.28;
  float m0 = a * 0.72 * sin(dot(p, d0) * kMid * 1.05 - t * wMid);
  float m1 = a * 0.64 * sin(dot(p, d2) * kMid * 0.92 + t * wMid * 0.86);
  float m2 = a * 0.52 * sin(dot(p, d4) * kMid * 0.78 - t * wMid * 1.08);

  // --- Fine chop / capillary-like ripples (high k, faster phase) ---
  float kRip = 12.0 + wf * 1.85;
  float wRip = sqrt(max(kRip, 0.35)) * 1.55;
  float c0 = a * 0.5 * sin(dot(p, d0) * kRip - t * wRip);
  float c1 = a * 0.44 * sin(dot(p, d3) * kRip * 0.91 + t * wRip * 1.02);
  float c2 =
    a * 0.36 * sin(dot(p, vec2(3.05, -2.18)) * (kRip * 0.68) - t * wRip * 1.12);

  // --- Radial ring ripples + cross term (sparkle without polar singularity) ---
  float kRad = 9.5 + wf * 0.75;
  float rad = a * 0.42 * sin(r * kRad - t * sqrt(kRad) * 1.35);
  float xym = mix(6.5, 11.0, wfN);
  float xy = a * 0.26 * sin(p.x * p.y * xym - t * (1.45 + wf * 0.06));

  float boundary =
    R + s0 + s1 + m0 + m1 + m2 + c0 + c1 + c2 + rad + xy;
  return r - boundary;
}

/**
 * Primary lens as vertical flutes: effective radius ripples with x (reeds run along +y).
 * Wave frequency → reed density; wave strength → flute depth (matches blob/water sliders).
 */
float verticalReedsSdf(vec2 p) {
  float r = length(p);
  float R = u_blobRadius;
  float t = u_time;
  float wf = clamp(u_waveFreq, 1.0, 16.0);
  float wfN = (wf - 1.0) / 15.0;
  float reedCount = mix(3.5, 22.0, wfN);
  float k = reedCount * 3.14159265359 / max(R, 1e-4);
  float a = u_waveAmp * R * 0.92;
  float ripple = a * sin(p.x * k + t * 0.38);
  return r - (R + ripple);
}

/** Horizontal flutes: radius ripples with y (reeds run along +x). */
float horizontalReedsSdf(vec2 p) {
  float r = length(p);
  float R = u_blobRadius;
  float t = u_time;
  float wf = clamp(u_waveFreq, 1.0, 16.0);
  float wfN = (wf - 1.0) / 15.0;
  float reedCount = mix(3.5, 22.0, wfN);
  float k = reedCount * 3.14159265359 / max(R, 1e-4);
  float a = u_waveAmp * R * 0.92;
  float ripple = a * sin(p.y * k + t * 0.38);
  return r - (R + ripple);
}

float shapeSdf(vec2 p) {
  if (u_shapeMode == 0) {
    return blobSdf(p);
  }
  if (u_shapeMode == 1) {
    return cubeSdf(p);
  }
  if (u_shapeMode == 2) {
    return metaballsSdf(p);
  }
  if (u_shapeMode == 3) {
    return waterSdf(p);
  }
  if (u_shapeMode == 4) {
    return verticalReedsSdf(p);
  }
  if (u_shapeMode == 5) {
    return horizontalReedsSdf(p);
  }
  return waterSdf(p);
}

vec2 sdfGradient(vec2 p) {
  float e = 0.0012 * max(u_blobRadius, 0.08);
  float gx = shapeSdf(p + vec2(e, 0.0)) - shapeSdf(p - vec2(e, 0.0));
  float gy = shapeSdf(p + vec2(0.0, e)) - shapeSdf(p - vec2(0.0, e));
  return vec2(gx, gy) / (2.0 * e);
}

/** Linear gradient in logo UV [0,1]²; full span across the bbox (CSS-like). */
vec3 svgGradientRgb(vec2 uvTex) {
  float ang = u_svgGradientAngle;
  vec2 d = vec2(sin(ang), cos(ang));
  float proj = dot(uvTex, d) + u_svgGradientOffset;
  float tMin = min(0.0, min(d.x, min(d.y, d.x + d.y)));
  float tMax = max(0.0, max(d.x, max(d.y, d.x + d.y)));
  float t = (proj - tMin) / max(tMax - tMin, 1e-5);
  t = clamp(t, 0.0, 1.0);
  float gs = max(u_svgGradientScale, 1e-4);
  t = clamp(0.5 + (t - 0.5) / gs, 0.0, 1.0);
  if (u_svgGradientStops > 2.5) {
    if (t < 0.5) {
      return mix(u_svgTintRgb, u_svgGradientRgb2, t * 2.0);
    }
    return mix(u_svgGradientRgb2, u_svgGradientRgb3, (t - 0.5) * 2.0);
  }
  return mix(u_svgTintRgb, u_svgGradientRgb2, t);
}

/** Straight RGBA from the image (no background); alpha 0 outside the image rect or if no image. */
vec4 sampleSceneTex(vec2 uv) {
  if (u_hasImage < 0.5) {
    return vec4(0.0);
  }
  vec2 uvTex;
  if (u_vjDupVertical > 0.5) {
    /** Full-viewport tiling: each logo matches contain-fit size (u_vjSpan*); repeats fill the canvas. */
    /** Stair pattern repeats every this many rows so logos don’t drift off-screen. */
    const float VJ_STAIR_CYCLE = 8.0;
    float strideY = u_vjSpanH + u_vjDupGap;
    float y = uv.y - u_vjAnchorY + u_vjDupScrollTime;
    float row = floor(y / max(strideY, 1e-6));
    float yInStride = y - row * strideY;
    if (yInStride < 0.0 || yInStride > u_vjSpanH) {
      return vec4(0.0);
    }
    float vTex = yInStride / max(u_vjSpanH, 1e-6);
    float rowPhase = mod(row, VJ_STAIR_CYCLE);
    float centerX = u_vjCenterX + u_vjDupHorizStep * rowPhase;
    float uTex = (uv.x + u_vjDupScrollTimeX - centerX + u_vjSpanW * 0.5) / max(u_vjSpanW, 1e-6);
    if (uTex < 0.0 || uTex > 1.0) {
      return vec4(0.0);
    }
    uvTex = vec2(uTex, vTex);
  } else {
    vec2 local = (uv - u_imageRect.xy) / u_imageRect.zw;
    if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
      return vec4(0.0);
    }
    uvTex = local;
  }
  vec4 tex = texture(u_image, uvTex);
  vec3 rgb = tex.rgb;
  if (u_svgTintMode > 0.5) {
    if (u_svgTintMode < 1.5) {
      rgb = rgb * u_svgTintRgb;
    } else if (u_svgTintMode < 2.5) {
      rgb = u_svgTintRgb;
    } else if (u_svgTintMode < 3.5) {
      rgb = rgb * svgGradientRgb(uvTex);
    } else {
      rgb = svgGradientRgb(uvTex);
    }
  }
  return vec4(rgb, tex.a);
}

/** Underlay bitmap (PNG flash logo); optional rgb multiply; contain-mapped in image letterbox. */
vec4 sampleUnderlayTex(vec2 uv) {
  if (u_underlayActive < 0.5) {
    return vec4(0.0);
  }
  vec2 local = (uv - u_imageRect.xy) / u_imageRect.zw;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
    return vec4(0.0);
  }
  float uTex = (local.x - u_underlayCell.x) / max(u_underlayCell.z, 1e-6);
  float vTex = (local.y - u_underlayCell.y) / max(u_underlayCell.w, 1e-6);
  if (uTex < 0.0 || uTex > 1.0 || vTex < 0.0 || vTex > 1.0) {
    return vec4(0.0);
  }
  vec4 t = texture(u_underlay, vec2(uTex, vTex));
  t.rgb *= u_underlayTintRgb;
  return t;
}

/** Top overlay (second logo); same cell mapping as underlay, optional tint. */
vec4 sampleOverlayTex(vec2 uv) {
  if (u_overlayLayerActive < 0.5) {
    return vec4(0.0);
  }
  /**
   * Primary letterbox local space (same basis as u_overlayCell). Do not clamp local to 0–1:
   * at scale above 1 the overlay quad extends past the primary artwork rect; clamping hid those
   * pixels so the layer looked masked by the main logo bounds.
   */
  vec2 local = (uv - u_imageRect.xy) / u_imageRect.zw;
  float uTex = (local.x - u_overlayCell.x) / max(u_overlayCell.z, 1e-6);
  float vTex = (local.y - u_overlayCell.y) / max(u_overlayCell.w, 1e-6);
  /**
   * Match primary-layer sampling semantics: out-of-bounds UV should be fully transparent.
   * Clamping to edge can pull colored border texels back into frame under distortion and
   * create visible axis-aligned artifacts on some SVGs.
   */
  if (uTex < 0.0 || uTex > 1.0 || vTex < 0.0 || vTex > 1.0) {
    return vec4(0.0);
  }
  /**
   * Drop the outermost texel ring so scale/distortion cannot expose a thin bbox line from
   * border interpolation when the sampled SVG edge sits right on the texture boundary.
   */
  vec2 edge = 1.0 / vec2(textureSize(u_overlayLayer, 0));
  if (
    uTex <= edge.x ||
    uTex >= 1.0 - edge.x ||
    vTex <= edge.y ||
    vTex >= 1.0 - edge.y
  ) {
    return vec4(0.0);
  }
  vec4 t = texture(u_overlayLayer, vec2(uTex, vTex));
  if (u_overlayTintMode > 0.5) {
    if (u_overlayTintMode < 1.5) {
      t.rgb *= u_overlayTintRgb;
    } else {
      t.rgb = u_overlayTintRgb;
    }
  }
  return t;
}

vec3 overlayBlendRgb(vec3 base, vec3 src, int mode) {
  if (mode == 1) {
    return base * src;
  }
  if (mode == 2) {
    return 1.0 - (1.0 - base) * (1.0 - src);
  }
  if (mode == 3) {
    return base + src;
  }
  if (mode == 4) {
    vec3 low = 2.0 * base * src;
    vec3 hi = 1.0 - 2.0 * (1.0 - base) * (1.0 - src);
    return mix(low, hi, step(0.5, base));
  }
  if (mode == 5) {
    return abs(base - src);
  }
  return src;
}

/**
 * Scene color for chroma + frost: composite image over canvas background in display (sRGB) space.
 * Grayscale art has R=G=B per texel; splitting R/G/B *after* mixing with a bg reproduces
 * colored fringes (same as the live viewport).
 */
vec3 sampleScene(vec2 uv) {
  if (u_hasImage < 0.5) {
    return u_bgColor.rgb;
  }
  vec4 t = sampleSceneTex(uv);
  return mix(u_bgColor.rgb, t.rgb, t.a);
}

vec4 sampleSceneRGBA(vec2 uv) {
  if (u_hasImage < 0.5) {
    return u_bgColor;
  }
  vec4 t = sampleSceneTex(uv);
  if (u_transparentSceneBg > 0.5) {
    return vec4(t.rgb, t.a);
  }
  vec3 rgb = mix(u_bgColor.rgb, t.rgb, t.a);
  float a = mix(u_bgColor.a, 1.0, t.a);
  return vec4(rgb, a);
}

vec4 premulScene(vec4 c) {
  return vec4(c.rgb * c.a, c.a);
}

vec4 unpremulScene(vec4 p) {
  return p.a > 1e-5 ? vec4(p.rgb / p.a, p.a) : vec4(0.0);
}

/** Photoshop-style hue: only rotates chroma; S≈0 leaves white / gray / black unchanged. */
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

vec4 blurBinomial5x5_rgba(vec2 uv, vec2 s) {
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 5; j++) {
    for (int i = 0; i < 5; i++) {
      vec2 o = vec2(float(i - 2), float(j - 2)) * s;
      acc += premulScene(sampleSceneRGBA(uv + o)) * BLUR_W5[i] * BLUR_W5[j];
    }
  }
  return unpremulScene(acc);
}

vec4 blurBinomial7x7_rgba(vec2 uv, vec2 s) {
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 7; j++) {
    for (int i = 0; i < 7; i++) {
      vec2 o = vec2(float(i - 3), float(j - 3)) * s;
      acc += premulScene(sampleSceneRGBA(uv + o)) * BLUR_W7[i] * BLUR_W7[j];
    }
  }
  return unpremulScene(acc);
}

vec4 blurBinomial11x11_rgba(vec2 uv, vec2 s) {
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 11; j++) {
    for (int i = 0; i < 11; i++) {
      vec2 o = vec2(float(i - 5), float(j - 5)) * s;
      acc += premulScene(sampleSceneRGBA(uv + o)) * BLUR_W11[i] * BLUR_W11[j];
    }
  }
  return unpremulScene(acc);
}

/** Same ±5s UV footprint as 11×11, 15×15 denser taps (less “ridge” banding). */
vec4 blurBinomial15x15_rgba_dense(vec2 uv, vec2 s) {
  float cell = 10.0 / 14.0;
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 15; j++) {
    for (int i = 0; i < 15; i++) {
      vec2 o = vec2(float(i) - 7.0, float(j) - 7.0) * cell * s;
      acc += premulScene(sampleSceneRGBA(uv + o)) * BLUR_W15[i] * BLUR_W15[j];
    }
  }
  return unpremulScene(acc);
}

/** ~512 effective 2D taps; same ±5s footprint as 11×11, very smooth (heavy GPU). */
vec4 blurBinomial23x23_rgba_dense(vec2 uv, vec2 s) {
  float cell = 10.0 / 22.0;
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 23; j++) {
    for (int i = 0; i < 23; i++) {
      vec2 o = vec2(float(i) - 11.0, float(j) - 11.0) * cell * s;
      acc += premulScene(sampleSceneRGBA(uv + o)) * BLUR_W23[i] * BLUR_W23[j];
    }
  }
  return unpremulScene(acc);
}

vec4 sampleSceneBlurredRGBA(vec2 uv, float blurPx) {
  vec4 sharp = sampleSceneRGBA(uv);
  if (blurPx < 0.001) {
    return sharp;
  }
  vec2 s = blurPx * 1.1 / u_resolution;
  vec4 blurred;
  if (u_blurQuality < 1.5) {
    blurred = blurBinomial5x5_rgba(uv, s);
  } else if (u_blurQuality < 2.5) {
    blurred = blurBinomial7x7_rgba(uv, s);
  } else if (u_blurQuality < 3.5) {
    blurred = blurBinomial11x11_rgba(uv, s);
  } else if (u_blurQuality < 4.5) {
    blurred = blurBinomial15x15_rgba_dense(uv, s);
  } else {
    blurred = blurBinomial23x23_rgba_dense(uv, s);
  }
  float t = smoothstep(0.0, 1.25, blurPx);
  return mix(sharp, blurred, t);
}

vec4 sampleSceneChromaRGBA(vec2 uv, float spread, float frostPx) {
  if (u_chroma <= 0.0001) {
    return sampleSceneBlurredRGBA(uv, frostPx);
  }
  float a = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 off = vec2(spread / u_resolution.x, spread / u_resolution.y) * a;
  float r = sampleSceneBlurredRGBA(uv + vec2(off.x, 0.0), frostPx).r;
  float g = sampleSceneBlurredRGBA(uv, frostPx).g;
  float b = sampleSceneBlurredRGBA(uv - vec2(off.x, 0.0), frostPx).b;
  float alpha = sampleSceneBlurredRGBA(uv, frostPx).a;
  return vec4(r, g, b, alpha);
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

vec3 blurBinomial11x11(vec2 uv, vec2 s) {
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 11; j++) {
    for (int i = 0; i < 11; i++) {
      vec2 o = vec2(float(i - 5), float(j - 5)) * s;
      acc += sampleScene(uv + o) * BLUR_W11[i] * BLUR_W11[j];
    }
  }
  return acc;
}

vec3 blurBinomial15x15_dense(vec2 uv, vec2 s) {
  float cell = 10.0 / 14.0;
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 15; j++) {
    for (int i = 0; i < 15; i++) {
      vec2 o = vec2(float(i) - 7.0, float(j) - 7.0) * cell * s;
      acc += sampleScene(uv + o) * BLUR_W15[i] * BLUR_W15[j];
    }
  }
  return acc;
}

vec3 blurBinomial23x23_dense(vec2 uv, vec2 s) {
  float cell = 10.0 / 22.0;
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 23; j++) {
    for (int i = 0; i < 23; i++) {
      vec2 o = vec2(float(i) - 11.0, float(j) - 11.0) * cell * s;
      acc += sampleScene(uv + o) * BLUR_W23[i] * BLUR_W23[j];
    }
  }
  return acc;
}

/** u_blurQuality: 1=25, 2=49, 3=121, 4=225 dense, 5=529 dense (~512). */
vec3 sampleSceneBlurred(vec2 uv, float blurPx) {
  vec3 sharp = sampleScene(uv);
  if (blurPx < 0.001) {
    return sharp;
  }
  vec2 s = blurPx * 1.1 / u_resolution;
  vec3 blurred;
  if (u_blurQuality < 1.5) {
    blurred = blurBinomial5x5(uv, s);
  } else if (u_blurQuality < 2.5) {
    blurred = blurBinomial7x7(uv, s);
  } else if (u_blurQuality < 3.5) {
    blurred = blurBinomial11x11(uv, s);
  } else if (u_blurQuality < 4.5) {
    blurred = blurBinomial15x15_dense(uv, s);
  } else {
    blurred = blurBinomial23x23_dense(uv, s);
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

/** 0–1 hash; decorrelated from neighbors for grain. */
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/** Screen-space glass plate layered after lens refraction (additive UV offset). */
vec2 filterGlass(vec2 uv) {
  if (u_filterMode == 0) {
    return vec2(0.0);
  }
  // 2× headroom vs original so slider=1 hits stronger displacement.
  float fs = clamp(u_filterStrength, 0.0, 1.0) * 2.0;
  if (fs < 1e-5) {
    return vec2(0.0);
  }
  float sc = clamp(u_filterScale, 0.0, 1.0);
  // All modes: sc=0 → smallest/thinnest features, sc=1 → largest/widest (inverted where needed).
  float resPx = max(u_resolution.x, u_resolution.y);
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);

  float mot = max(u_filterMotionSpeed, 0.0);
  float tf = u_time * mot;
  // Constant-direction drift (down-right); tf=0 → no motion. Halftone uses fract(uv+scroll) so it never blows up.
  vec2 scroll = vec2(tf * 0.0019, tf * 0.00135);
  vec2 uvP = uv + scroll;

  if (u_filterMode == 1) {
    float freq = mix(128.0, 20.0, sc);
    float amp = 0.0052 * fs;
    float ph = tf * 0.15;
    return vec2(sin(uvP.y * freq * 6.28318530718 + ph), 0.0) * amp;
  }
  if (u_filterMode == 2) {
    vec2 d = (uvP - u_blobCenter) * aspect;
    float r = length(d);
    vec2 nrm = r > 1e-5 ? d / r : vec2(0.0);
    float rings = sin(r * mix(96.0, 28.0, sc) * 6.28318530718 - tf * 0.7);
    float amp = 0.0038 * fs;
    return vec2(nrm.x / aspect.x, nrm.y) * rings * amp;
  }
  if (u_filterMode == 3) {
    float cells = mix(resPx, 96.0, sc);
    vec2 g = floor(uvP * cells);
    float a = hash12(g);
    float b = hash12(g + vec2(31.0, 17.0));
    float c = hash12(g + vec2(113.0, 47.0));
    float m = hash12(floor(uvP * resPx * 1.5) + vec2(211.0, 91.0));
    vec2 grain = vec2(
      fract(a + b * 0.5 + c * 0.28 + m * 0.22) - 0.5,
      fract(b + c * 0.52 + a * 0.26 + m * 0.24) - 0.5
    ) * 2.0;
    return grain * (0.0034 * fs);
  }
  if (u_filterMode == 4) {
    // Isotropic tiling (same as bubbles) so dots sit side-by-side without aspect gaps; cap cells so “fine” isn’t microscopic.
    float cells = mix(min(resPx, 78.0), 22.0, sc);
    float ax = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 st = fract(vec2(uvP.x * cells * ax, uvP.y * cells)) - 0.5;
    float rp = length(st);
    float R = 0.5 - 0.006;
    float aaW = max(fwidth(rp) * 2.25, R * 0.005);
    float rim = 1.0 - smoothstep(R - aaW, R + aaW, rp);
    float inner = smoothstep(0.038, 0.1, rp);
    float win = inner * rim;
    vec2 dir = rp > 1e-4 ? st / rp : vec2(0.0);
    float rosette =
      sin((rp / max(R, 1e-4)) * 6.28318530718 * 3.0 + tf * 0.25);
    float amp = 0.0042 * fs;
    return vec2(dir.x / ax, dir.y) * rosette * win * amp;
  }
  if (u_filterMode == 5) {
    float freq = mix(128.0, 20.0, sc);
    float amp = 0.0052 * fs;
    float ph = tf * 0.15;
    return vec2(0.0, sin(uvP.x * freq * 6.28318530718 + ph)) * amp;
  }
  if (u_filterMode == 10) {
    float freq = mix(128.0, 20.0, sc);
    float amp = 0.0052 * fs;
    float ph = tf * 0.15;
    float gx = sin(uvP.y * freq * 6.28318530718 + ph);
    float gy = sin(uvP.x * freq * 6.28318530718 + ph);
    return vec2(gx, gy) * amp;
  }
  if (u_filterMode == 6) {
    // Square pixelate: snap UV to a uniform grid (strength blends toward full snap).
    float cells = mix(resPx, 18.0, sc);
    cells = max(cells, 4.0);
    vec2 g = floor(uvP * cells);
    vec2 center = (g + vec2(0.5)) / cells;
    float str = clamp(u_filterStrength, 0.0, 1.0);
    return (center - uvP) * str;
  }
  if (u_filterMode == 7) {
    // Mosaic with per-tile random subdivision (mixed block sizes; motion drifts the chaos).
    float M = mix(12.0, 4.0, sc);
    M = max(M, 3.0);
    vec2 c = floor(uvP * M);
    float ta = hash12(c + vec2(1.7, 0.0));
    float tb = hash12(c + vec2(0.0, 9.3));
    float tj = tf * (0.07 + mot * 0.04);
    float bx = fract(ta * 13.37 + tj * 0.71);
    float by = fract(tb * 11.09 - tj * 0.53);
    float nMin = mix(10.0, 3.0, sc);
    float nMax = mix(72.0, 14.0, sc);
    float Nx = mix(nMin, nMax, bx);
    float Ny = mix(nMin, nMax, by);
    vec2 fr = fract(uvP * M);
    vec2 snap = (floor(fr * vec2(Nx, Ny)) + vec2(0.5)) / vec2(Nx, Ny);
    vec2 center = (c + snap) / M;
    float str = clamp(u_filterStrength, 0.0, 1.0);
    return (center - uvP) * str;
  }
  if (u_filterMode == 8 || u_filterMode == 9) {
    // Isotropic screen-space tiling: fract(uv.x*cells*ax, uv.y*cells) → square cells in pixels,
    // so circular caps touch side-by-side on any aspect (avoids gaps when ax≠1).
    float cells = mix(min(resPx * 0.35, 52.0), 11.0, sc);
    float ax = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 st = fract(vec2(uvP.x * cells * ax, uvP.y * cells)) - 0.5;
    float rp = length(st);
    float R = 0.5 - 0.004;
    float aaW = max(fwidth(rp) * 2.75, R * 0.006);
    float rim = 1.0 - smoothstep(R - aaW, R + aaW, rp);
    float t = clamp(rp / max(R, 1e-4), 0.0, 1.0);
    vec2 dir = rp > 1e-5 ? st / rp : vec2(0.0);
    float fsq = clamp(u_filterStrength, 0.0, 1.0) * 2.0;
    if (u_filterMode == 8) {
      // Convex lens without t/z blow-up at rim (that caused dark outline rings on flat bg).
      float bell = sin(t * 1.57079632679);
      float mag = bell * bell * (0.35 + 0.65 * t) * rim;
      float amp = 0.0051 * fsq;
      return vec2(dir.x / ax, dir.y) * mag * amp;
    }
    float mag = (1.0 - t * t) * (1.0 - t * t) * rim;
    float amp = 0.0029 * fsq;
    return vec2(dir.x / ax, dir.y) * mag * amp;
  }
  return vec2(0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - u_blobCenter) * aspect;

  float sdf = shapeSdf(p);
  vec2 g = sdfGradient(p);
  /** Wider inner ramp so SDF gradient doesn’t spike at the optical center. */
  float core = smoothstep(0.0, u_blobRadius * 0.108 + 1e-6, length(p));
  g *= core;
  float glen = length(g);
  vec2 n = glen > 1e-4 ? g / glen : vec2(0.0);

  /**
   * Wavy blob boundaries make n highly non-radial near the origin → UV displacement
   * “petals” / pinch. Blend n toward pure radial inside a small core so the center
   * stays soft without changing the outer lens silhouette much.
   */
  float pr = length(p);
  float pinchW = u_blobRadius * 0.23;
  /** Bias blend toward radial (exponent > 1) so the center stays softer. */
  float pinchRelax = smoothstep(0.0, pinchW + 1e-6, pr);
  pinchRelax = pow(pinchRelax, 2.2);
  vec2 radialDir =
    pr > 1e-5 ? p / pr : (glen > 1e-4 ? n : vec2(0.0, 1.0));
  vec2 nRefract = normalize(mix(radialDir, n, pinchRelax));

  // Single edge band: softness + fwidth AA. Refraction and frost both key off this width.
  float aa = max(fwidth(sdf), 1e-6);
  float edgeW = max(u_edgeSoftness, aa * 2.25);
  float lens = smoothstep(edgeW, -edgeW, sdf);

  vec2 refr = nRefract.xy;
  refr.x /= aspect.x;

  float falloff = lens * (0.35 + 0.65 * smoothstep(-u_blobRadius * 0.35, 0.0, sdf));
  vec2 distort = refr * u_refractStrength * falloff;

  vec2 detailOff = vec2(0.0);
  /**
   * Dirt / stain mask from the same normal sample. Most tangent-space maps keep Z near 1, so
   * (1 - Nz) stays tiny; XY slant matches where displacement is strong (visible grime variation).
   */
  float detailHeight = 0.0;
  bool useDetailTex =
    u_hasImage > 0.5 &&
    (u_detailDistortAmp > 1e-6 || u_detailDirtStrength > 1e-6);
  if (useDetailTex) {
    float sc = max(u_detailDistortScale, 0.08);
    vec2 nuv = uv * sc + u_time * vec2(0.00035, 0.00026);
    vec3 Nt = texture(u_detailNormal, nuv).rgb * 2.0 - 1.0;
    vec3 Nn = normalize(Nt);
    float mask = falloff * lens;
    if (u_detailDistortAmp > 1e-6) {
      vec2 dir = vec2(Nn.x, -Nn.y);
      detailOff = dir * (u_detailDistortAmp * mask);
      detailOff.x /= aspect.x;
    }
    float slant = clamp(length(Nn.xy), 0.0, 1.0);
    float cavity = clamp(1.0 - Nn.z, 0.0, 1.0);
    float raw = max(slant * 1.85, cavity * 0.95);
    detailHeight = pow(clamp(raw, 0.0, 1.0), 0.82);
  }

  vec2 glassOff = filterGlass(uv);
  /** Bubbles / dots: only inside the liquid lens so the lattice doesn’t print on flat background. */
  if (u_filterMode == 8 || u_filterMode == 9) {
    glassOff *= lens;
  }
  vec2 uvR = uv + distort + glassOff + detailOff;

  // Frost: same edgeW as silhouette, but outer ramp extends when frost is high so blur
  // feathers the transition (no second hard ring). No extra “glow” — only blurred samples.
  float frostOuter = edgeW * (1.0 + 0.32 * clamp(u_frostBlur, 0.0, 14.0));
  float frostBlend = smoothstep(frostOuter, -edgeW, sdf);
  float frostPx = u_frostBlur * frostBlend;
  float chromaSpread = u_chroma * falloff * 48.0;
  vec3 col;
  float outA;
  if (u_transparentSceneBg > 0.5) {
    vec4 rgba = sampleSceneChromaRGBA(uvR, chromaSpread, frostPx);
    col = rgba.rgb;
    outA = rgba.a;
    /** Scene (SVG) over underlay — same distorted UV as main texture so refraction + filterGlass apply. */
    if (u_underlayActive > 0.5 && u_underlayOpacity > 1e-5) {
      vec4 bot = sampleUnderlayTex(uvR);
      bot.a *= u_underlayOpacity;
      vec4 tp = vec4(col * outA, outA);
      vec4 bp = vec4(bot.rgb * bot.a, bot.a);
      vec4 comp = tp + bp * (1.0 - tp.a);
      float denom = max(comp.a, 1e-5);
      col = comp.rgb / denom;
      outA = comp.a;
    }
  } else {
    col = sampleSceneChroma(uvR, chromaSpread, frostPx);
    outA = 1.0;
  }

  if (u_overlayLayerActive > 0.5 && u_overlayOpacity > 1e-5) {
    vec2 ovUv = u_overlayFollowDistort > 0.5 ? uvR : uv;
    vec4 ov = sampleOverlayTex(ovUv);
    float a = clamp(ov.a * u_overlayOpacity, 0.0, 1.0);
    if (a > 1e-5) {
      vec3 src = ov.rgb;
      int bm = u_overlayBlendMode;
      if (bm == 0) {
        col = mix(col, src, a);
      } else {
        vec3 blended = overlayBlendRgb(col, src, bm);
        col = mix(col, blended, a);
      }
      if (u_transparentSceneBg > 0.5) {
        outA = a + outA * (1.0 - a);
      }
    }
  }

  /** Dirt / colour stain: multiply tint by detailHeight (spatially varying). */
  if (u_detailDirtStrength > 1e-6 && detailHeight > 1e-6) {
    float dm =
      clamp(detailHeight * 1.08, 0.0, 1.0) * falloff * lens * u_detailDirtStrength;
    vec3 dirtMul = mix(vec3(1.0), u_detailDirtRgb, dm);
    col *= dirtMul;
  }

  /** VJ glass neon: mask with lens silhouette (inside the glass). */
  float gradeMask = lens * clamp(u_glassGradeStrength, 0.0, 2.0);
  if (u_glassGradeMode > 0 && gradeMask > 1e-4) {
    float m = gradeMask;
    if (u_glassGradeMode == 1) {
      vec3 g = clamp(u_glassNeonA * 1.65, 0.0, 2.4);
      vec3 screened = 1.0 - (1.0 - col) * (1.0 - g * 0.85);
      vec3 pumped = mix(col, screened, m);
      vec3 mult = col * mix(vec3(1.0), u_glassNeonA * 2.2, m);
      col = mix(pumped, mult, 0.35);
    } else {
      float y = dot(col, vec3(0.2126, 0.7152, 0.0722));
      y = pow(clamp(y, 0.0, 1.0), 0.48);
      vec3 duo = mix(u_glassNeonB * 1.1, u_glassNeonA * 1.25, y);
      col = mix(col, duo, m);
    }
  }

  col = hueShiftRgbPreserveNeutrals(col, u_globalHueShift);

  if (u_transparentSceneBg > 0.5) {
    fragColor = vec4(col, outA);
  } else {
    fragColor = vec4(col, 1.0);
  }
}
`;
