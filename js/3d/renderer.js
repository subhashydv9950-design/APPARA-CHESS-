
/* =========================================================
   APPARA CHESS — FILE 22
   FILE PATH: js/3d/renderer.js

   PURPOSE:
   Three.js renderer setup, responsive canvas,
   animation loop, pause/resume and cleanup.

   DEPENDENCY:
   Three.js import map will be configured in index.html.
========================================================= */

import * as THREE from "three";

export class ChessRenderer {
  constructor(options = {}) {
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.isRunning = false;
    this.isDisposed = false;
    this.isContextLost = false;

    this.pixelRatioLimit = options.pixelRatioLimit ?? 1.75;
    this.antialias = options.antialias ?? true;
    this.alpha = options.alpha ?? false;
    this.powerPreference = options.powerPreference ?? "high-performance";

    this.resizeObserver = null;
    this.resizeHandler = null;

    this.callbacks = {
      beforeRender: options.beforeRender ?? null,
      afterRender: options.afterRender ?? null,
      onContextLost: options.onContextLost ?? null,
      onContextRestored: options.onContextRestored ?? null,
      onError: options.onError ?? null
    };

    this.stats = {
      frames: 0,
      lastFrameTime: 0,
      deltaTime: 0
    };
  }

  initialize(container) {
    if (this.isDisposed) {
      throw new Error("Renderer has already been disposed.");
    }

    if (this.renderer) {
      return this.renderer;
    }

    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!container) {
      throw new Error("3D renderer container was not found.");
    }

    this.container = container;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: this.antialias,
        alpha: this.alpha,
        powerPreference: this.powerPreference,
        stencil: true,
        depth: true
      });

      this.renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          this.pixelRatioLimit
        )
      );

      this.renderer.setSize(
        Math.max(1, container.clientWidth),
        Math.max(1, container.clientHeight),
        false
      );

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.renderer.domElement.className = "apparachess-3d-canvas";
      this.renderer.domElement.setAttribute(
        "aria-label",
        "APPARA CHESS 3D game scene"
      );

      this.renderer.domElement.style.display = "block";
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.touchAction = "none";

      this.container.appendChild(this.renderer.domElement);

      this.attachContextEvents();
      this.setupResizeObserver();
      this.resize();

      return this.renderer;

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  setScene(scene) {
    if (!(scene instanceof THREE.Scene)) {
      throw new TypeError("setScene requires a THREE.Scene.");
    }

    this.scene = scene;
    return this;
  }

  setCamera(camera) {
    if (
      !camera ||
      !camera.isCamera
    ) {
      throw new TypeError("setCamera requires a Three.js camera.");
    }

    this.camera = camera;
    this.resize();
    return this;
  }

  getRenderer() {
    return this.renderer;
  }

  getCanvas() {
    return this.renderer?.domElement ?? null;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  setupResizeObserver() {
    if (!this.container) return;

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });

      this.resizeObserver.observe(this.container);
    } else {
      this.resizeHandler = () => this.resize();
      window.addEventListener("resize", this.resizeHandler);
    }
  }

  resize() {
    if (!this.renderer || !this.container) return;

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer.setSize(width, height, false);

    if (this.camera?.isPerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.camera?.isOrthographicCamera) {
      this.camera.updateProjectionMatrix();
    }
  }

  attachContextEvents() {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();

      this.isContextLost = true;
      this.stop();

      this.callbacks.onContextLost?.(event);
    });

    canvas.addEventListener("webglcontextrestored", (event) => {
      this.isContextLost = false;

      this.resize();

      this.callbacks.onContextRestored?.(event);

      if (!this.isDisposed) {
        this.start();
      }
    });
  }

  render(deltaTime = 0) {
    if (
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      this.isContextLost ||
      this.isDisposed
    ) {
      return;
    }

    try {
      this.callbacks.beforeRender?.({
        deltaTime,
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer
      });

      this.renderer.render(this.scene, this.camera);

      this.stats.frames += 1;
      this.stats.deltaTime = deltaTime;
      this.stats.lastFrameTime = performance.now();

      this.callbacks.afterRender?.({
        deltaTime,
        stats: this.getStats()
      });

    } catch (error) {
      this.handleError(error);
    }
  }

  start() {
    if (
      !this.renderer ||
      this.isRunning ||
      this.isDisposed ||
      this.isContextLost
    ) {
      return false;
    }

    this.isRunning = true;

    this.renderer.setAnimationLoop((time) => {
      if (!this.isRunning || this.isDisposed) return;

      const previousTime = this.stats.lastFrameTime || time;
      const deltaTime = Math.min(
        Math.max((time - previousTime) / 1000, 0),
        0.1
      );

      this.render(deltaTime);
    });

    return true;
  }

  stop() {
    if (!this.renderer || !this.isRunning) {
      return false;
    }

    this.isRunning = false;
    this.renderer.setAnimationLoop(null);

    return true;
  }

  pause() {
    return this.stop();
  }

  resume() {
    return this.start();
  }

  setQuality(level) {
    const qualitySettings = {
      low: {
        pixelRatio: 1,
        shadows: false
      },
      medium: {
        pixelRatio: 1.25,
        shadows: true
      },
      high: {
        pixelRatio: 1.5,
        shadows: true
      },
      ultra: {
        pixelRatio: 2,
        shadows: true
      }
    };

    const settings = qualitySettings[level];

    if (!settings || !this.renderer) {
      return false;
    }

    const deviceRatio = window.devicePixelRatio || 1;

    this.renderer.setPixelRatio(
      Math.min(deviceRatio, settings.pixelRatio)
    );

    this.renderer.shadowMap.enabled = settings.shadows;

    this.resize();

    return true;
  }

  getStats() {
    return {
      frames: this.stats.frames,
      deltaTime: this.stats.deltaTime,
      lastFrameTime: this.stats.lastFrameTime,
      running: this.isRunning,
      contextLost: this.isContextLost
    };
  }

  handleError(error) {
    if (typeof this.callbacks.onError === "function") {
      this.callbacks.onError(error);
    } else {
      console.error("[APPARA CHESS Renderer]", error);
    }
  }

  dispose() {
    if (this.isDisposed) return;

    this.stop();

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.renderer) {
      this.renderer.dispose();

      const canvas = this.renderer.domElement;

      if (canvas?.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }

      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.container = null;

    this.isDisposed = true;
  }
}

export function createChessRenderer(container, options = {}) {
  const instance = new ChessRenderer(options);
  instance.initialize(container);
  return instance;
}

/* =========================================================
   FILE 22 END — renderer.js
========================================================= */
        
