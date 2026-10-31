import type { FX } from '../types';
import { defaultFX } from '../defaults';
import { hexToGl } from '../lib/util';

const VS = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const HEAD = `
precision highp float;
varying vec2 uv;
uniform vec2 uRes;      // output size in px
uniform float uScale;   // px per doc unit
uniform float uSeed;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

const GEO = HEAD + `
uniform sampler2D t;
uniform float mode;
uniform float seg;
void main(){
  vec2 m = uv;
  if (mode == 1.0) { if (m.x > 0.5) m.x = 1.0 - m.x; }
  else if (mode == 2.0) { if (m.x < 0.5) m.x = 1.0 - m.x; }
  else if (mode == 3.0) { if (m.y < 0.5) m.y = 1.0 - m.y; }
  else if (mode == 4.0) { m.x = 0.5 - abs(m.x - 0.5); m.y = 0.5 + abs(m.y - 0.5); }
  else if (mode == 5.0) {
    vec2 p = m - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float s = 6.2831853 / seg;
    a = mod(a, s);
    a = abs(a - s * 0.5);
    m = 0.5 + r * vec2(cos(a), sin(a));
  }
  gl_FragColor = texture2D(t, clamp(m, 0.0, 1.0));
}`;

// 4x4 box filter for clean downscales (webcam / pixelate source)
const DOWN = HEAD + `
uniform sampler2D t;
uniform vec2 srcTexel;
uniform float k;
void main(){
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
    acc += texture2D(t, uv + (vec2(float(i), float(j)) - 1.5) / 4.0 * k * srcTexel);
  }
  gl_FragColor = acc / 16.0;
}`;

const COLOR = HEAD + `
uniform sampler2D t;
uniform vec2 srcTexel;
uniform float exposure, brightness, contrast, saturation, hue, temperature, tintAmt, blacks, fade, sharpen, jpeg;
uniform float mode, modeMix;
uniform vec3 shadowC, highC;
vec3 hueShift(vec3 c, float a){
  mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a;
  float ch = length(yiq.yz);
  yiq.y = ch * cos(h); yiq.z = ch * sin(h);
  return toRGB * yiq;
}
vec3 thermal(float l){
  vec3 c0 = vec3(0.0, 0.0, 0.1), c1 = vec3(0.1, 0.0, 0.6), c2 = vec3(0.8, 0.0, 0.6), c3 = vec3(1.0, 0.25, 0.0), c4 = vec3(1.0, 0.9, 0.1), c5 = vec3(1.0);
  if (l < 0.2) return mix(c0, c1, l / 0.2);
  if (l < 0.4) return mix(c1, c2, (l - 0.2) / 0.2);
  if (l < 0.6) return mix(c2, c3, (l - 0.4) / 0.2);
  if (l < 0.8) return mix(c3, c4, (l - 0.6) / 0.2);
  return mix(c4, c5, (l - 0.8) / 0.2);
}
void main(){
  vec3 c = texture2D(t, uv).rgb;
  if (sharpen > 0.0) {
    vec3 n = texture2D(t, uv + vec2(0.0, srcTexel.y)).rgb + texture2D(t, uv - vec2(0.0, srcTexel.y)).rgb
           + texture2D(t, uv + vec2(srcTexel.x, 0.0)).rgb + texture2D(t, uv - vec2(srcTexel.x, 0.0)).rgb;
    c += (c * 4.0 - n) * sharpen * 1.5;
  }
  if (jpeg > 0.0) {
    float B = (6.0 + jpeg * 12.0) * uScale;
    vec2 px = uv * uRes;
    vec2 b0 = floor(px / B) * B;
    vec3 mean = vec3(0.0);
    for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
      mean += texture2D(t, (b0 + (vec2(float(i), float(j)) + 0.5) / 4.0 * B) / uRes).rgb;
    }
    mean /= 16.0;
    float y = lum(c), ym = lum(mean);
    float q = 0.04 + jpeg * 0.22;
    y = ym + floor((y - ym) / q + 0.5) * q;
    vec3 chroma = mix(c - lum(c), mean - ym, clamp(jpeg * 1.4, 0.0, 1.0));
    c = vec3(y) + chroma;
  }
  c *= pow(2.0, exposure);
  c += brightness * 0.5;
  c = (c - 0.5) * (1.0 + contrast) + 0.5;
  c = max(c - blacks, 0.0) / (1.0 - blacks);
  float l = lum(c);
  c = mix(vec3(l), c, 1.0 + saturation);
  if (hue != 0.0) c = hueShift(c, hue);
  // white balance after saturation so a cold/warm cast survives a desaturated grade
  c.r += temperature * 0.12; c.b -= temperature * 0.12; c.g += tintAmt * 0.1;
  c = fade * 0.22 + c * (1.0 - fade * 0.3);
  c = clamp(c, 0.0, 1.0);
  l = lum(c);
  vec3 m = c;
  if (mode == 1.0) m = vec3(l);
  else if (mode == 2.0) m = mix(shadowC, highC, smoothstep(0.0, 1.0, l));
  else if (mode == 3.0) m = l < 0.5 ? mix(vec3(0.0), highC, l * 2.0) : mix(highC, vec3(1.0), (l - 0.5) * 2.0);
  else if (mode == 4.0) { float g = pow(l, 0.8) * 1.35; m = vec3(0.1, 1.0, 0.25) * g + vec3(0.01, 0.05, 0.02); }
  else if (mode == 5.0) m = thermal(l);
  else if (mode == 6.0) m = 1.0 - c;
  else if (mode == 7.0) m = vec3(1.0 - l) * vec3(0.78, 0.9, 1.0);
  else if (mode == 8.0) m = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
  c = mix(c, m, modeMix);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const BRIGHT = HEAD + `
uniform sampler2D t;
uniform float thr;
void main(){
  vec3 c = texture2D(t, uv).rgb;
  float l = lum(c);
  gl_FragColor = vec4(c * smoothstep(thr, thr + 0.25, l), 1.0);
}`;

const BLUR = HEAD + `
uniform sampler2D t;
uniform vec2 dir; // texel step * spacing
void main(){
  vec4 a = texture2D(t, uv) * 0.2270270270;
  a += texture2D(t, uv + dir * 1.3846153846) * 0.3162162162;
  a += texture2D(t, uv - dir * 1.3846153846) * 0.3162162162;
  a += texture2D(t, uv + dir * 3.2307692308) * 0.0702702703;
  a += texture2D(t, uv - dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = a;
}`;

const STYLIZE = HEAD + `
uniform sampler2D t;
uniform float mode, cell, level, keepColor;
uniform vec3 ink, paper;
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  vec2 px = uv * uRes;
  vec3 c = texture2D(t, uv).rgb;
  float l = lum(c);
  vec3 inkC = keepColor > 0.5 ? c : ink;
  vec3 o = c;
  if (mode == 1.0) {
    float aa = 0.6 / max(1.0, uScale * 4.0);
    o = mix(inkC, paper, smoothstep(level - aa, level + aa, l));
  } else if (mode == 2.0) {
    float s = max(1.0, cell * 0.5 * uScale);
    vec2 cellId = floor(px / s);
    vec3 cc = texture2D(t, (cellId + 0.5) * s / uRes).rgb;
    float ll = lum(cc) + (level - 0.5);
    o = ll > bayer8(cellId) ? paper : (keepColor > 0.5 ? cc : ink);
  } else if (mode == 3.0) {
    float s = max(2.0, cell * 1.4 * uScale);
    mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
    mat2 inv = mat2(0.7071, 0.7071, -0.7071, 0.7071);
    vec2 q = rot * px;
    vec2 ctr = (floor(q / s) + 0.5) * s;
    vec3 cc = texture2D(t, clamp((inv * ctr) / uRes, 0.0, 1.0)).rgb;
    float ll = clamp(lum(cc) + (level - 0.5), 0.0, 1.0);
    float rad = sqrt(1.0 - ll) * s * 0.72;
    float d = length(q - ctr);
    float edge = smoothstep(rad + 0.75, rad - 0.75, d);
    o = mix(paper, keepColor > 0.5 ? cc : ink, edge);
  } else if (mode == 4.0) {
    float s = max(2.0, cell * uScale);
    float v = px.y / s + l * 0.45 + sin(px.x / (s * 16.0)) * 0.12;
    float d = abs(fract(v) - 0.5) * 2.0;
    float thick = clamp(1.0 - l + (0.5 - level), 0.0, 1.0);
    float e = smoothstep(thick + 0.12, thick - 0.12, d);
    o = mix(paper, inkC, e);
  } else if (mode == 5.0) {
    float n = 2.0 + floor(level * 8.0);
    o = floor(c * n + 0.5) / n;
  }
  gl_FragColor = vec4(o, 1.0);
}`;

const FINAL = HEAD + `
uniform sampler2D t;
uniform sampler2D glowT;
uniform float glow, flash, vignette, chroma, vhs, scanlines, grain, grainSize, grainColor, dust;
float vnoise(vec2 p, float s){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i + s), b = hash(i + vec2(1.0, 0.0) + s), c = hash(i + vec2(0.0, 1.0) + s), d = hash(i + vec2(1.0, 1.0) + s);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main(){
  vec2 px = uv * uRes;
  vec2 st = uv;
  float band = 0.0;
  if (vhs > 0.0) {
    float line = floor(px.y / (2.0 * uScale));
    st.x += (hash(vec2(line, uSeed)) - 0.5) * vhs * 0.006;
    float by = fract(uSeed * 0.137 + 0.18);
    band = smoothstep(0.05, 0.0, abs(uv.y - by));
    st.x += band * vhs * 0.03 * (hash(vec2(line * 1.7, uSeed + 3.0)) - 0.2);
    st.x += sin(uv.y * 40.0 + uSeed) * vhs * 0.0015;
  }
  vec2 dirv = (uv - 0.5);
  vec2 off = dirv * chroma * 0.02 + vec2(vhs * 0.004, 0.0);
  vec3 c;
  c.r = texture2D(t, st + off).r;
  c.g = texture2D(t, st).g;
  c.b = texture2D(t, st - off).b;
  if (glow > 0.0) {
    vec3 g = texture2D(glowT, uv).rgb;
    c = 1.0 - (1.0 - c) * (1.0 - clamp(g * glow * 1.8, 0.0, 1.0));
  }
  float d = length(dirv);
  if (flash > 0.0) {
    float hot = exp(-d * d * 5.0);
    c = c * (1.0 + flash * (hot * 1.15 - 0.45)) + flash * hot * 0.06;
    c = mix(c, c * c * (3.0 - 2.0 * c), flash * 0.35);
    c.b += flash * 0.03;
  }
  if (vignette > 0.0) c *= 1.0 - vignette * smoothstep(0.2, 0.8, d * 1.15);
  if (scanlines > 0.0) {
    float s = 0.5 + 0.5 * sin(px.y / (1.6 * uScale) * 3.14159);
    c *= 1.0 - scanlines * 0.45 * (1.0 - s);
  }
  if (band > 0.0) c += band * vhs * (hash(px + uSeed) - 0.5) * 0.6;
  if (grain > 0.0) {
    vec2 gp = px / max(0.6, grainSize * uScale);
    float l = lum(c);
    float amt = grain * (0.35 + 0.65 * (1.0 - abs(l - 0.45) * 1.3));
    if (grainColor > 0.5) {
      c += (vec3(vnoise(gp, uSeed), vnoise(gp, uSeed + 17.0), vnoise(gp, uSeed + 41.0)) - 0.5) * amt * 0.6;
    } else {
      c += (vnoise(gp, uSeed) - 0.5) * amt * 0.6;
    }
  }
  if (dust > 0.0) {
    float cs = 22.0 * uScale;
    vec2 cid = floor(px / cs);
    float h = hash(cid + uSeed * 0.71);
    if (h < dust * 0.35) {
      vec2 p = (cid + vec2(hash(cid + 1.3), hash(cid + 7.1))) * cs;
      float r = (0.5 + hash(cid + 3.3) * 2.2) * uScale;
      float a = smoothstep(r, r * 0.4, length(px - p));
      c = mix(c, vec3(hash(cid + 9.9) > 0.45 ? 0.95 : 0.04), a * 0.85);
    }
    float sx = floor(px.x / (3.0 * uScale));
    float sh = hash(vec2(sx, uSeed));
    if (sh < dust * 0.012) c = mix(c, vec3(0.9), 0.35 * smoothstep(0.0, 1.0, vnoise(vec2(sx, px.y / (60.0 * uScale)), uSeed)));
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

interface Target { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }

export function fxIsNeutral(fx: FX) {
  const d = defaultFX();
  const keys = Object.keys(d) as (keyof FX)[];
  const ignore = new Set<keyof FX>(['segments', 'modeMix', 'shadowColor', 'highlightColor', 'cell', 'level', 'ink', 'paper', 'keepColor', 'glowThreshold', 'grainSize', 'grainColor', 'seed']);
  return keys.every((k) => ignore.has(k) || (k === 'grain' ? fx.grain === 0 : fx[k] === d[k]));
}

export class FxEngine {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  maxSize: number;
  private progs = new Map<string, { p: WebGLProgram; u: Map<string, WebGLUniformLocation | null> }>();
  private pool = new Map<string, Target>();
  private srcTex: WebGLTexture;
  private poolSize = 0;

  static create(): FxEngine | null {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
      if (!gl) return null;
      return new FxEngine(c, gl);
    } catch {
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array));
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.srcTex = this.makeTex();
    for (const [name, src] of Object.entries({ GEO, DOWN, COLOR, BRIGHT, BLUR, STYLIZE, FINAL })) this.compile(name, src);
  }

  private makeTex(filter: number = this.gl.LINEAR) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private compile(name: string, fs: string) {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${name}: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name}: ${gl.getProgramInfoLog(p)}`);
    this.progs.set(name, { p, u: new Map() });
  }

  private target(slot: string, w: number, h: number, filter: number = this.gl.LINEAR): Target {
    const gl = this.gl;
    const k = `${slot}:${w}x${h}:${filter}`;
    let t = this.pool.get(k);
    if (!t) {
      const tex = this.makeTex(filter);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      t = { tex, fb, w, h };
      this.pool.set(k, t);
    }
    return t;
  }

  private releasePool() {
    const gl = this.gl;
    for (const t of this.pool.values()) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fb);
    }
    this.pool.clear();
  }

  private pass(name: string, out: Target | null, inputs: WebGLTexture[], uniforms: Record<string, number | number[]>) {
    const gl = this.gl;
    const prog = this.progs.get(name)!;
    gl.useProgram(prog.p);
    const w = out ? out.w : this.canvas.width;
    const h = out ? out.h : this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    gl.viewport(0, 0, w, h);
    const loc = (n: string) => {
      if (!prog.u.has(n)) prog.u.set(n, gl.getUniformLocation(prog.p, n));
      return prog.u.get(n)!;
    };
    const all: Record<string, number | number[]> = { uRes: [w, h], uScale: w / 1000, ...uniforms };
    for (const [n, v] of Object.entries(all)) {
      const l = loc(n);
      if (!l) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else gl.uniform3f(l, v[0], v[1], v[2]);
    }
    const samplers = name === 'FINAL' ? ['t', 'glowT'] : ['t'];
    inputs.forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const l = loc(samplers[i]);
      if (l) gl.uniform1i(l, i);
    });
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private blur(src: Target, radiusPx: number, slot: string, iterations = 2): Target {
    const d = Math.max(1, Math.min(8, Math.round(radiusPx / 10)));
    const w = Math.max(4, Math.round(src.w / d));
    const h = Math.max(4, Math.round(src.h / d));
    const a = this.target(slot + 'a', w, h);
    const b = this.target(slot + 'b', w, h);
    this.pass('DOWN', a, [src.tex], { srcTexel: [1 / src.w, 1 / src.h], k: src.w / w });
    const spacing = Math.max(0.5, radiusPx / d / 3.2 / iterations);
    for (let i = 0; i < iterations; i++) {
      this.pass('BLUR', b, [a.tex], { dir: [spacing / w, 0] });
      this.pass('BLUR', a, [b.tex], { dir: [0, spacing / h] });
    }
    return a;
  }

  /** Runs the effect stack over a square source canvas. Result is left in this.canvas. */
  render(src: HTMLCanvasElement, fx: FX): HTMLCanvasElement {
    const gl = this.gl;
    const R = src.width;
    if (this.canvas.width !== R || this.canvas.height !== R) {
      this.canvas.width = R;
      this.canvas.height = R;
    }
    if (this.poolSize !== R) {
      this.releasePool();
      this.poolSize = R;
    }
    const scale = R / 1000;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const seed = (fx.seed % 997) + 0.5;
    let cur: Target = { tex: this.srcTex, fb: null as unknown as WebGLFramebuffer, w: R, h: R };

    const mirrorMode = ['none', 'left', 'right', 'top', 'quad', 'kaleido'].indexOf(fx.mirror);
    if (mirrorMode > 0) {
      const t = this.target('geo', R, R);
      this.pass('GEO', t, [cur.tex], { mode: mirrorMode, seg: Math.max(2, fx.segments), uSeed: seed });
      cur = t;
    }

    if (fx.lowres > 0 || fx.pixelate > 0) {
      let size = R;
      if (fx.lowres > 0) size = Math.min(size, Math.round(R * (1 - fx.lowres * 0.9)));
      if (fx.pixelate > 0) size = Math.min(size, Math.round(1000 / (2 + fx.pixelate * 46)));
      size = Math.max(8, size);
      const nearest = fx.pixelate > 0;
      const t = this.target('small', size, size, nearest ? gl.NEAREST : gl.LINEAR);
      this.pass('DOWN', t, [cur.tex], { srcTexel: [1 / cur.w, 1 / cur.h], k: cur.w / size });
      cur = t;
    }

    const colorT = this.target('color', R, R);
    const modeIdx = ['none', 'bw', 'duotone', 'colorize', 'nightvision', 'thermal', 'invert', 'xray', 'sepia'].indexOf(fx.mode);
    this.pass('COLOR', colorT, [cur.tex], {
      srcTexel: [1 / cur.w, 1 / cur.h],
      exposure: fx.exposure, brightness: fx.brightness, contrast: fx.contrast, saturation: fx.saturation,
      hue: (fx.hue * Math.PI) / 180, temperature: fx.temperature, tintAmt: fx.tint, blacks: Math.min(0.9, fx.blacks), fade: fx.fade,
      sharpen: fx.sharpen, jpeg: fx.jpeg, mode: Math.max(0, modeIdx), modeMix: fx.modeMix,
      shadowC: hexToGl(fx.shadowColor), highC: hexToGl(fx.highlightColor), uSeed: seed,
    });
    cur = colorT;

    let glowTex: WebGLTexture = colorT.tex;
    if (fx.glow > 0) {
      const d = 4;
      const bw = Math.max(4, Math.round(R / d));
      const bt = this.target('bright', bw, bw);
      this.pass('BRIGHT', bt, [colorT.tex], { thr: fx.glowThreshold });
      glowTex = this.blur(bt, ((15 + fx.glow * 45) * scale) / d, 'glow', 2).tex;
    }

    if (fx.blur > 0) cur = this.blur(colorT, fx.blur * 30 * scale, 'soft', 2);

    const styIdx = ['none', 'threshold', 'dither', 'halftone', 'engrave', 'posterize'].indexOf(fx.stylize);
    if (styIdx > 0) {
      const t = this.target('sty', R, R);
      this.pass('STYLIZE', t, [cur.tex], {
        mode: styIdx, cell: fx.cell, level: fx.level, keepColor: fx.keepColor ? 1 : 0, ink: hexToGl(fx.ink), paper: hexToGl(fx.paper),
      });
      cur = t;
    }

    this.pass('FINAL', null, [cur.tex, glowTex], {
      glow: fx.glow, flash: fx.flash, vignette: fx.vignette, chroma: fx.chroma, vhs: fx.vhs, scanlines: fx.scanlines,
      grain: fx.grain, grainSize: fx.grainSize, grainColor: fx.grainColor ? 1 : 0, dust: fx.dust, uSeed: seed,
    });
    return this.canvas;
  }
}
