
/* =========================================================
   APPARA CHESS — FILE 24
   FILE PATH: js/3d/camera-manager.js

   PURPOSE:
   Camera setup, camera presets, zoom,
   orbit movement and smooth transitions.

   DEPENDENCY:
   Three.js import map configured in index.html.
========================================================= */

import * as THREE from "three";
import { OrbitControls } from
  "three/addons/controls/OrbitControls.js";

export const CAMERA_PRESETS = Object.freeze({
  cinematic: {
    position: [9, 8, 10],
    target: [0, 0, 0],
    fov: 38,
    minDistance: 7,
    maxDistance: 22,
    enableRotate: true
  },

  top: {
    position: [0, 15, 0.01],
    target: [0, 0, 0],
    fov: 42,
    minDistance: 9,
    maxDistance: 20,
    enableRotate: false
  },

  player: {
    position: [0, 10, 12],
    target: [0, 0, 0],
    fov: 40,
    minDistance: 8,
    maxDistance: 18,
    enableRotate: true
  },

  side: {
    position: [14, 7, 0],
    target: [0, 0, 0],
    fov: 42,
    minDistance: 8,
    maxDistance: 20,
    enableRotate: true
  },

  dramatic: {
    position: [8, 5, 13],
    target: [0, 0, 0],
    fov: 32,
    minDistance: 8,
    maxDistance: 18,
    enableRotate: true
  }
});

export class CameraManager {
  constructor(options = {}) {
    this.renderer = options.renderer ?? null;
    this.container = options.container ?? null;

    this.camera = null;
    this.controls = null;

    this.currentPreset = "cinematic";
    this.currentTarget = new THREE.Vector3(0, 0, 0);

    this.transition = null;
    this.isInitialized = false;
    this.isDisposed = false;

    this.settings = {
      enableDamping: true,
      dampingFactor: 0.06,
      rotateSpeed: 0.65,
      zoomSpeed: 0.8,
      panSpeed: 0.55,
      minPolarAngle: 0.15,
      maxPolarAngle: Math.PI / 2.05,
      defaultFov: 40
    };
  }

  initialize() {
    if (this.isDisposed) {
      throw new Error("CameraManager has been disposed.");
    }

    if (this.camera) return this.camera;

    const width = Math.max(
      1,
      this.container?.clientWidth || window.innerWidth
    );

    const height = Math.max(
      1,
      this.container?.clientHeight || window.innerHeight
    );

    this.camera = new THREE.PerspectiveCamera(
      this.settings.defaultFov,
      width / height,
      0.1,
      500
    );

    this.applyPreset("cinematic", false);

    if (this.renderer) {
      this.renderer.setCamera(this.camera);
    }

    this.initializeControls();

    this.isInitialized = true;

    return this.camera;
  }

  initializeControls() {
    if (!this.camera || !this.container) return;

    this.controls = new OrbitControls(
      this.camera,
      this.container
    );

    this.controls.enableDamping =
      this.settings.enableDamping;

    this.controls.dampingFactor =
      this.settings.dampingFactor;

    this.controls.rotateSpeed =
      this.settings.rotateSpeed;

    this.controls.zoomSpeed =
      this.settings.zoomSpeed;

    this.controls.panSpeed =
      this.settings.panSpeed;

    this.controls.minPolarAngle =
      this.settings.minPolarAngle;

    this.controls.maxPolarAngle =
      this.settings.maxPolarAngle;

    this.controls.enablePan = false;
    this.controls.enabled = true;

    this.controls.target.copy(this.currentTarget);
    this.controls.update();
  }

  applyPreset(name, smooth = true) {
    const preset = CAMERA_PRESETS[name];

    if (!preset) {
      throw new Error(`Unknown camera preset: ${name}`);
    }

    if (!this.camera) {
      this.initialize();
    }

    const destination = {
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
      fov: preset.fov
    };

    if (smooth) {
      this.moveTo(destination, 850);
    } else {
      this.camera.position.copy(destination.position);
      this.camera.fov = destination.fov;
      this.camera.updateProjectionMatrix();

      this.currentTarget.copy(destination.target);

      if (this.controls) {
        this.controls.target.copy(destination.target);
        this.controls.update();
      } else {
        this.camera.lookAt(destination.target);
      }
    }

    if (this.controls) {
      this.controls.minDistance = preset.minDistance;
      this.controls.maxDistance = preset.maxDistance;
      this.controls.enableRotate = preset.enableRotate;
    }

    this.currentPreset = name;

    return true;
  }

  moveTo(destination, duration = 800) {
    if (!this.camera) return false;

    const targetPosition = destination.position;
    const targetLookAt = destination.target;

    if (
      !(targetPosition instanceof THREE.Vector3) ||
      !(targetLookAt instanceof THREE.Vector3)
    ) {
      throw new TypeError(
        "Camera destination requires Vector3 position and target."
      );
    }

    this.transition = {
      startPosition: this.camera.position.clone(),
      endPosition: targetPosition.clone(),

      startTarget: this.controls
        ? this.controls.target.clone()
        : this.currentTarget.clone(),

      endTarget: targetLookAt.clone(),

      startFov: this.camera.fov,
      endFov: destination.fov ?? this.camera.fov,

      elapsed: 0,
      duration: Math.max(1, duration)
    };

    return true;
  }

  update(deltaTime = 0) {
    if (!this.camera || this.isDisposed) return;

    if (this.transition) {
      this.updateTransition(deltaTime);
    }

    if (this.controls) {
      this.controls.update();
      this.currentTarget.copy(this.controls.target);
    }
  }

  updateTransition(deltaTime) {
    const transition = this.transition;

    if (!transition) return;

    transition.elapsed += deltaTime * 1000;

    const progress = Math.min(
      transition.elapsed / transition.duration,
      1
    );

    const eased = this.easeInOutCubic(progress);

    this.camera.position.lerpVectors(
      transition.startPosition,
      transition.endPosition,
      eased
    );

    this.camera.fov = THREE.MathUtils.lerp(
      transition.startFov,
      transition.endFov,
      eased
    );

    this.camera.updateProjectionMatrix();

    const target = new THREE.Vector3().lerpVectors(
      transition.startTarget,
      transition.endTarget,
      eased
    );

    if (this.controls) {
      this.controls.target.copy(target);
    } else {
      this.camera.lookAt(target);
    }

    this.currentTarget.copy(target);

    if (progress >= 1) {
      this.transition = null;
    }
  }

  easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  focusOn(position, options = {}) {
    if (!this.camera) return false;

    const point = position instanceof THREE.Vector3
      ? position.clone()
      : new THREE.Vector3(
          position.x ?? 0,
          position.y ?? 0,
          position.z ?? 0
        );

    const offset = options.offset
      ? new THREE.Vector3(...options.offset)
      : new THREE.Vector3(6, 6, 8);

    const distance = options.duration ?? 700;

    return this.moveTo({
      position: point.clone().add(offset),
      target: point,
      fov: options.fov ?? this.camera.fov
    }, distance);
  }

  zoomIn(amount = 1) {
    if (!this.camera || !this.controls) return false;

    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target);

    const distance = Math.max(
      this.controls.minDistance,
      direction.length() - amount
    );

    direction.setLength(distance);

    this.camera.position.copy(
      this.controls.target.clone().add(direction)
    );

    this.controls.update();

    return true;
  }

  zoomOut(amount = 1) {
    if (!this.camera || !this.controls) return false;

    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target);

    const distance = Math.min(
      this.controls.maxDistance,
      direction.length() + amount
    );

    direction.setLength(distance);

    this.camera.position.copy(
      this.controls.target.clone().add(direction)
    );

    this.controls.update();

    return true;
  }

  setFov(value) {
    if (!this.camera) return false;

    this.camera.fov = THREE.MathUtils.clamp(
      value,
      20,
      75
    );

    this.camera.updateProjectionMatrix();

    return true;
  }

  resize(width, height) {
    if (!this.camera) return;

    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
  }

  setUserControls(enabled) {
    if (this.controls) {
      this.controls.enabled = Boolean(enabled);
    }
  }

  getCamera() {
    return this.camera;
  }

  getControls() {
    return this.controls;
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  dispose() {
    if (this.isDisposed) return;

    this.transition = null;

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    this.camera = null;
    this.renderer = null;
    this.container = null;

    this.isInitialized = false;
    this.isDisposed = true;
  }
}

export function createCameraManager(options = {}) {
  const manager = new CameraManager(options);
  manager.initialize();
  return manager;
}

/* =========================================================
   FILE 24 END — camera-manager.js
========================================================= */
      
