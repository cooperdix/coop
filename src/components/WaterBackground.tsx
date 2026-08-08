import { useEffect, useRef } from 'react';
import { VERT, FRAG, WATER_THEMES } from '../lib/waterShader';

/**
 * A full-viewport sheet of moving water behind the page.
 *
 * Everything here is defensive on purpose, because this is decoration sitting
 * underneath a guide people are trying to read:
 *
 *  - if WebGL is missing or the shaders fail to compile, the canvas is left
 *    blank and the page keeps the flat background colour from the stylesheet;
 *  - `prefers-reduced-motion` draws one still frame instead of animating;
 *  - the loop stops when the tab is hidden and when the canvas scrolls out of
 *    reach, so a background tab is not burning a GPU;
 *  - device pixel ratio is capped, since a retina display gains nothing
 *    visible here and costs four times the fragments.
 */
export function WaterBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) as
        | WebGLRenderingContext
        | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return;
    }
    gl.useProgram(prog);

    // One full-screen triangle pair.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'uRes'),
      time: gl.getUniformLocation(prog, 'uTime'),
      top: gl.getUniformLocation(prog, 'uTop'),
      bottom: gl.getUniformLocation(prog, 'uBottom'),
      glow: gl.getUniformLocation(prog, 'uGlow'),
      intensity: gl.getUniformLocation(prog, 'uIntensity'),
    };

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const applyTheme = () => {
      // An explicit choice on the document wins over the operating system,
      // matching how the stylesheet resolves its own tokens.
      const stamped = document.documentElement.getAttribute('data-theme');
      const dark = stamped ? stamped === 'dark' : darkQuery.matches;
      const t = dark ? WATER_THEMES.dark : WATER_THEMES.light;
      gl.uniform3fv(u.top, t.top);
      gl.uniform3fv(u.bottom, t.bottom);
      gl.uniform3fv(u.glow, t.glow);
      gl.uniform1f(u.intensity, t.intensity);
    };

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nw = Math.max(1, Math.round(window.innerWidth * dpr));
      const nh = Math.max(1, Math.round(window.innerHeight * dpr));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
    };

    let raf = 0;
    let running = false;
    const start = performance.now();

    const draw = (now: number) => {
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const play = () => {
      if (running || motionQuery.matches || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    resize();
    applyTheme();

    if (motionQuery.matches) {
      // Still water: one frame, then nothing moves.
      draw(start);
    } else {
      play();
    }

    const onResize = () => {
      resize();
      if (motionQuery.matches) draw(performance.now());
    };
    const onVisibility = () => (document.hidden ? stop() : play());
    const onScheme = () => {
      applyTheme();
      if (motionQuery.matches) draw(performance.now());
    };
    const onMotion = () => {
      if (motionQuery.matches) {
        stop();
        draw(performance.now());
      } else {
        play();
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    darkQuery.addEventListener('change', onScheme);
    motionQuery.addEventListener('change', onMotion);

    // The stylesheet can also be re-themed by a `data-theme` stamp, which no
    // media query reports on.
    const observer = new MutationObserver(onScheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      darkQuery.removeEventListener('change', onScheme);
      motionQuery.removeEventListener('change', onMotion);
      observer.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="water-bg" aria-hidden="true" />;
}
