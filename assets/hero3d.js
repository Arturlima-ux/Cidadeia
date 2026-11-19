// Abertura em profundidade: a foto do salão vira uma câmera de verdade (dolly com paralaxe por mapa de
// profundidade) e as luzes ficam vivas (brilho que respira, poeira dourada no ar). Tudo num único
// fragment shader. Se o aparelho não suportar WebGL ou pedir menos movimento, a página segue com a foto
// e a animação CSS de sempre.
const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FS = `precision highp float;
uniform sampler2D uImg,uDep,uBlm;
uniform vec2 uRes,uFocus,uCam;
uniform float uAsp,uT,uZoom,uLamp,uRoom,uFade,uBlur;
uniform vec4 uLn;
float h11(float n){return fract(sin(n*127.1)*43758.5453);}
vec2 h12(float n){return vec2(h11(n),h11(n+19.7));}
void main(){
  vec2 uv=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uRes;
  float ca=uRes.x/uRes.y;
  vec2 s=ca>uAsp?vec2(1.,uAsp/ca):vec2(ca/uAsp,1.);
  vec2 p=(uv-.5)*s/1.075+.5;
  // dolly: perto da câmera anda mais que o fundo (profundidade real, não só zoom)
  float z=uZoom+uBlur*.10;
  vec2 q=p;
  for(int i=0;i<2;i++){
    float d=texture2D(uDep,q).r;
    q=uFocus+(p-uFocus)/(1.+z*(.10+.36*d));
  }
  float d=texture2D(uDep,q).r;
  q+=(d-.42)*uCam*vec2(.034,.020);
  q=clamp(q,.002,.998);
  vec3 c=texture2D(uImg,q).rgb;
  vec3 b=texture2D(uBlm,q).rgb;
  if(uBlur>.001){
    float r=uBlur*.012;
    c=(c*2.+texture2D(uImg,clamp(q+vec2(r,0.),0.,1.)).rgb+texture2D(uImg,clamp(q-vec2(r,0.),0.,1.)).rgb+texture2D(uImg,clamp(q+vec2(0.,r),0.,1.)).rgb+texture2D(uImg,clamp(q-vec2(0.,r),0.,1.)).rgb)/6.;
    c*=1.-uBlur*.5;
  }
  // luzes que respiram
  float pul=1.;
  float room=mix(.20,1.,uRoom);
  float sp=1.;
  if(uLn.z>.5){
    float dl=length((uv-uLn.xy)*vec2(ca,1.));
    sp=smoothstep(uLn.w,uLn.w*.12,dl);
    sp=sp*sp*(3.-2.*sp);
    room=mix(.11,1.,sp*uRoom);
  }
  vec3 col=c*room;
  col+=b*uLamp*pul*.14*mix(1.,.45+.55*sp,step(.5,uLn.z));
  // feixes de luz caindo das luminárias
  vec3 ray=vec3(0.);
  for(int i=1;i<=10;i++){
    float k=float(i);
    vec2 o=vec2(sin(uT*.3+k)*.004,k*.022);
    ray+=texture2D(uBlm,clamp(q-o,0.,1.)).rgb*(1.-k/11.);
  }
  col+=ray*uLamp*pul*.03*vec3(1.,.82,.58)*mix(1.,sp,step(.5,uLn.z));
  // poeira dourada ao redor das luzes
  vec3 dust=vec3(0.);
  for(int i=0;i<0;i++){
    float fi=float(i)+1.;
    vec2 h=h12(fi*3.1);
    float dz=.25+.75*h11(fi*7.7);
    vec2 pos=vec2(fract(h.x+uT*(.004+.006*dz)*sin(fi)+sin(uT*.07*fi)*.03),fract(h.y-uT*(.006+.008*dz)));
    pos+=uCam*(dz-.4)*vec2(.02,.012);
    vec2 pp=(pos-.5)*s/1.075+.5; pp=uFocus+(pp-uFocus)/(1.+z*(.10+.36*dz));
    float lit=dot(texture2D(uBlm,clamp(pp,0.,1.)).rgb,vec3(.33));
    vec2 dd=(q-pp)*vec2(uAsp,1.);
    float rad=.0045+.011*dz;
    float k=smoothstep(rad,rad*.15,length(dd));
    float tw=.8+.2*sin(uT*(.15+h11(fi)*.2)+fi*5.);
    dust+=vec3(1.,.78,.46)*k*tw*clamp(lit*2.6,0.,1.)*.28;
  }
  col+=dust*uLamp;
  float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  
  col=mix(vec3(.07,.016,.016),col,uFade);
  gl_FragColor=vec4(col,1.);
}`;

const FOCO = { "casa-1": [.52, .34], "casa-2": [.5, .42] };
const ease = (a, b, c, d) => t => { // cubic-bezier como no CSS
  const cx = 3 * a, bx = 3 * (c - a) - cx, ax = 1 - cx - bx, cy = 3 * b, by = 3 * (d - b) - cy, ay = 1 - cy - by;
  const X = u => ((ax * u + bx) * u + cx) * u, Y = u => ((ay * u + by) * u + cy) * u;
  let u = t; for (let i = 0; i < 8; i++) { const e = X(u) - t; if (Math.abs(e) < 1e-4) break; u -= e / ((3 * ax * u + 2 * bx) * u + cx || 1); }
  return Y(Math.min(1, Math.max(0, u)));
};
const camera = ease(.2, .6, .2, 1), acende = ease(.3, .1, .2, 1);
const clamp01 = x => Math.min(1, Math.max(0, x));

const carrega = src => new Promise((ok, no) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = no; i.src = src; });

export const suporta = () => {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl", { failIfMajorPerformanceCaveat: false }));
  } catch (e) { return false; }
};

export async function monta(h, n, opc = {}) {
  const larg = Math.min(devicePixelRatio || 1, 2) * innerWidth > 720 ? "g" : "m";
  const [img, dep, blm] = await Promise.all([carrega(`/assets/f/${n}-${larg}.webp`), carrega(`/assets/f/${n}-d.webp`), carrega(`/assets/f/${n}-b.webp`)]);
  const cv = document.createElement("canvas");
  cv.className = "gl3d";
  const gl = cv.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("sem webgl");
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const la = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
  const tex = (i, im) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  tex(0, img); tex(1, dep); tex(2, blm);
  const U = k => gl.getUniformLocation(pr, k);
  gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uDep"), 1); gl.uniform1i(U("uBlm"), 2);
  const u = { res: U("uRes"), asp: U("uAsp"), t: U("uT"), zoom: U("uZoom"), lamp: U("uLamp"), room: U("uRoom"), fade: U("uFade"), blur: U("uBlur"), foco: U("uFocus"), cam: U("uCam"), ln: U("uLn") };
  const f = FOCO[n] || [.5, .4];
  gl.uniform2f(u.foco, f[0], f[1]); gl.uniform1f(u.asp, img.naturalWidth / img.naturalHeight);

  let W = 0, H = 0;
  const mede = () => {
    const r = h.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    let k = dpr; const px = r.width * r.height * k * k; if (px > 2.4e6) k *= Math.sqrt(2.4e6 / px);
    W = Math.max(2, Math.round(r.width * k)); H = Math.max(2, Math.round(r.height * k));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); gl.uniform2f(u.res, W, H); }
  };
  h.insertBefore(cv, h.firstChild); mede();
  addEventListener("resize", mede);

  // câmera: arrasta com o ponteiro / inclina o aparelho; sozinha, flutua devagar
  let px = 0, py = 0, cx = 0, cy = 0, gx = 0, gy = 0;
  const mov = e => { px = (e.clientX / innerWidth - .5) * 2; py = (e.clientY / innerHeight - .5) * 2; };
  addEventListener("pointermove", mov, { passive: true });
  const incl = e => { if (e.gamma == null) return; gx = Math.max(-1, Math.min(1, e.gamma / 25)); gy = Math.max(-1, Math.min(1, (e.beta - 50) / 25)); };
  addEventListener("deviceorientation", incl, { passive: true });

  const lan = !!opc.lanterna; let lx = .5, ly = .38, tx2 = .5, ty2 = .38, toque = false;
  if (lan) addEventListener("pointermove", e => { toque = true; tx2 = e.clientX / innerWidth; ty2 = e.clientY / innerHeight; }, { passive: true });
  let t0 = 0, blur = 0, blurAlvo = 0, vivo = true, ultimo = 0, tAcum = 0;
  const quadro = ts => {
    if (!vivo) return;
    const cena = document.body.dataset.cena, vis = !document.hidden && (cena === "abertura" || blurAlvo > 0);
    if (!vis) { ultimo = 0; setTimeout(() => requestAnimationFrame(quadro), 200); return; }
    if (!t0) t0 = ts;
    const dt = ultimo ? Math.min(.05, (ts - ultimo) / 1000) : 0; ultimo = ts; tAcum += dt;
    const t = (ts - t0) / 1000;
    blur += (blurAlvo - blur) * Math.min(1, dt * 3.2);
    const solta = clamp01((t - 11) / 4);
    const ax = Math.sin(tAcum * .11) * .6 * solta, ay = Math.cos(tAcum * .083) * .4 * solta;
    const slide = 1 - camera(clamp01(t / 11)), tx = px * .8 + gx + ax - slide * 1.3, ty = py * .6 + gy + ay + slide * .35;
    cx += (tx - cx) * Math.min(1, dt * 2.2); cy += (ty - cy) * Math.min(1, dt * 2.2);
    gl.uniform1f(u.t, tAcum);
    gl.uniform1f(u.zoom, 1 - camera(clamp01(t / 11)));
    gl.uniform1f(u.fade, acende(clamp01(t / 1.8)));
    gl.uniform1f(u.lamp, acende(clamp01((t - .15) / 1.7)));
    gl.uniform1f(u.room, acende(clamp01((t - .7) / 3.2)));
    gl.uniform1f(u.blur, blur);
    gl.uniform2f(u.cam, cx, cy);
    if (lan) {
      if (!toque) { tx2 = .5 + Math.sin(t * .55) * .32 + Math.sin(t * 1.3) * .05; ty2 = .36 + Math.sin(t * .41 + 1) * .22; }
      lx += (tx2 - lx) * Math.min(1, dt * 4); ly += (ty2 - ly) * Math.min(1, dt * 4);
      gl.uniform4f(u.ln, lx, ly, 1, .46);
      window.__luz = [lx, ly];
    } else gl.uniform4f(u.ln, 0, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
  h.classList.add("gl");
  return {
    desfoca: on => { blurAlvo = on ? 1 : 0; },
    fim: () => { vivo = false; removeEventListener("resize", mede); removeEventListener("pointermove", mov); removeEventListener("deviceorientation", incl); cv.remove(); h.classList.remove("gl"); }
  };
}
