const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_route;
uniform float u_dark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(7.1, 3.7);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / u_resolution.y;
  vec2 pointer = u_pointer - 0.5;
  pointer.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.055;
  float field = fbm(p * 2.25 + vec2(t, -t * 0.7));
  float filament = sin((p.x + field * 0.36) * 11.0 - t * 4.0) * 0.5 + 0.5;
  filament *= smoothstep(0.95, 0.15, abs(p.y + sin(p.x * 2.4 + t) * 0.12));
  float lens = exp(-4.8 * length(p - pointer));
  float paper = hash(gl_FragCoord.xy + floor(u_time * 8.0)) - 0.5;

  vec3 ink = vec3(0.06, 0.07, 0.055);
  vec3 paperLight = vec3(0.955, 0.95, 0.91);
  vec3 paperDark = vec3(0.035, 0.043, 0.035);
  vec3 base = mix(paperLight, paperDark, u_dark);
  vec3 accent = vec3(1.0, 0.31, 0.53);
  if (u_route > 0.5 && u_route < 1.5) accent = vec3(0.10, 0.27, 1.0);
  if (u_route > 1.5 && u_route < 2.5) accent = vec3(1.0, 0.25, 0.48);
  if (u_route > 2.5 && u_route < 3.5) accent = vec3(0.72, 1.0, 0.19);
  if (u_route > 3.5) accent = vec3(0.52, 0.26, 1.0);

  float strength = u_route < 0.5 ? 0.20 : u_route > 3.5 ? 0.18 : 0.075;
  vec3 colour = base;
  colour = mix(colour, accent, (field * 0.35 + filament * 0.42 + lens * 0.36) * strength);
  colour = mix(colour, ink, (1.0 - u_dark) * max(0.0, paper) * 0.018);
  colour += paper * 0.018;
  gl_FragColor = vec4(colour, 1.0);
}
`;

function shader(gl: WebGLRenderingContext, kind: number, source: string): WebGLShader {
  const value = gl.createShader(kind);
  if (!value) throw new Error("WebGL shader unavailable");
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value) ?? "WebGL shader failed");
  return value;
}

export function initialiseAtmosphere(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#atmosphere-canvas");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) { document.documentElement.classList.add("no-webgl"); return; }
  try {
    const program = gl.createProgram();
    if (!program) throw new Error("WebGL program unavailable");
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "WebGL link failed");
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointerUniform = gl.getUniformLocation(program, "u_pointer");
    const time = gl.getUniformLocation(program, "u_time");
    const routeUniform = gl.getUniformLocation(program, "u_route");
    const darkUniform = gl.getUniformLocation(program, "u_dark");
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const started = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const routeValue = () => ({ home: 0, slide: 1, deck: 2, next: 3, words: 4, plan: 0 } as Record<string, number>)[document.body.dataset.route ?? "home"] ?? 0;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, matchMedia("(max-width: 820px)").matches ? 1 : 1.45);
      const width = Math.max(1, Math.round(innerWidth * ratio));
      const height = Math.max(1, Math.round(innerHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, width, height);
    };
    const draw = (now: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.055;
      pointer.y += (pointer.ty - pointer.y) * 0.055;
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointerUniform, pointer.x, 1 - pointer.y);
      gl.uniform1f(time, reduced.matches ? 0 : (now - started) / 1000);
      gl.uniform1f(routeUniform, routeValue());
      gl.uniform1f(darkUniform, document.documentElement.dataset.theme === "dark" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const wake = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    window.addEventListener("pointermove", (event) => { pointer.tx = event.clientX / innerWidth; pointer.ty = event.clientY / innerHeight; }, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    document.addEventListener("visibilitychange", wake);
    new MutationObserver(wake).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    new MutationObserver(wake).observe(document.body, { attributes: true, attributeFilter: ["data-route"] });
    reduced.addEventListener("change", wake);
    wake();
  } catch (error) {
    document.documentElement.classList.add("no-webgl");
    canvas.hidden = true;
    console.warn("Atmosphere fallback active.", error);
  }
}
