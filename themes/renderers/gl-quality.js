/* Shared WebGL quality probe — software GL (SwiftShader etc.) needs tiny buffers + FPS cap. */
(function () {
  let cached = null;

  function rendererLooksSoftware(gl) {
    if (!gl) return true;
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
        if (/swiftshader|llvmpipe|softpipe|software|microsoft basic render|gdi generic|cpu/.test(r)) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function probe() {
    if (cached) return cached;
    if (typeof document === 'undefined') {
      cached = { software: true, renderer: 'unknown' };
      return cached;
    }
    const c = document.createElement('canvas');
    let gl = null;
    // Do not use failIfMajorPerformanceCaveat — it only logs FATAL when GPU is broken
    // and still leaves us on software; detect via renderer string instead.
    try {
      gl = c.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
      }) || c.getContext('experimental-webgl');
    } catch (e) {
      gl = null;
    }
    let renderer = '';
    try {
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      }
    } catch (e) {}
    const software = !gl || rendererLooksSoftware(gl);
    cached = { software, renderer: renderer || (software ? 'software' : 'gpu') };
    return cached;
  }

  window.GlQuality = {
    probe,
    isSoftware() {
      return !!probe().software;
    },
    renderer() {
      return probe().renderer || '';
    },
    /** Max WebGL backing-store edge length. */
    maxDim(preferred) {
      const pref = preferred > 0 ? preferred : 960;
      return probe().software ? Math.min(pref, 560) : pref;
    },
    /** Min ms between frames (0 = every rAF). */
    minFrameMs() {
      return probe().software ? 1000 / 24 : 0;
    },
    /** Segment count scale for heavy meshes. */
    segmentScale() {
      return probe().software ? 0.55 : 1;
    },
  };
})();
