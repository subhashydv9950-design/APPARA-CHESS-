/* =========================================================
   APPARA CHESS
   FILE: js/3d/camera-controller.js
   PREMIUM 3D CAMERA CONTROLLER
   FULL FILE REPLACEMENT
   ========================================================= */

import * as THREE from "three";

const CAMERA_PRESETS = {
  classic: {
    position: [10, 12, 15],
    target: [0, 1.7, 0]
  },

  top: {
    position: [0, 20, 0.01],
    target: [0, 1.7, 0]
  },

  cinematic: {
    position: [13, 8, 17],
    target: [0, 1.7, 0]
  },

  close: {
    position: [6, 8, 9],
    target: [0, 1.7, 0]
  },

  white: {
    position: [0, 10, 16],
    target: [0, 1.7, 0]
  },

  black: {
    position: [0, 10, -16],
    target: [0, 1.7, 0]
  }
};

export class ChessCameraController {
  constructor(camera, element, options = {}) {
    if (!camera || !element) {
      throw new Error(
        "ChessCameraController requires camera and element."
      );
    }

    this.camera = camera;
    this.element = element;

    this.options = {
      rotateSpeed: 0.006,
      zoomSpeed: 0.0015,
      minDistance: 7,
      maxDistance: 30,
      minPolarAngle: 0.12,
      maxPolarAngle: Math.PI * 0.46,
      damping: 0.16,
      target: new THREE.Vector3(0, 1.7, 0),
      ...options
    };

    this.target = this.options.target.isVector3
      ? this.options.target.clone()
      : new THREE.Vector3(0, 1.7, 0);

    this.currentSpherical = new THREE.Spherical();
    this.targetSpherical = new THREE.Spherical();

    this.pointerId = null;
    this.pointerX = 0;
    this.pointerY = 0;

    this.isRotating = false;
    this.enabled = true;
    this.disposed = false;

    this.boundPointerDown = e => this.onPointerDown(e);
    this.boundPointerMove = e => this.onPointerMove(e);
    this.boundPointerUp = e => this.onPointerUp(e);
    this.boundWheel = e => this.onWheel(e);
    this.boundContextMenu = e => e.preventDefault();

    this.initializePosition();
    this.attachEvents();
  }

  initializePosition() {
    this.camera.lookAt(this.target);

    const offset = this.camera.position
      .clone()
      .sub(this.target);

    this.currentSpherical.setFromVector3(offset);
    this.targetSpherical.copy(this.currentSpherical);

    this.clampSpherical();
  }

  attachEvents() {
    this.element.addEventListener(
      "pointerdown",
      this.boundPointerDown
    );

    this.element.addEventListener(
      "pointermove",
      this.boundPointerMove
    );

    this.element.addEventListener(
      "pointerup",
      this.boundPointerUp
    );

    this.element.addEventListener(
      "pointercancel",
      this.boundPointerUp
    );

    this.element.addEventListener(
      "wheel",
      this.boundWheel,
      { passive: false }
    );

    this.element.addEventListener(
      "contextmenu",
      this.boundContextMenu
    );
  }

  onPointerDown(event) {
    if (!this.enabled || this.disposed) return;

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    this.pointerId = event.pointerId;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.isRotating = true;
  }

  onPointerMove(event) {
    if (
      !this.enabled ||
      !this.isRotating ||
      this.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - this.pointerX;
    const deltaY = event.clientY - this.pointerY;

    this.pointerX = event.clientX;
    this.pointerY = event.clientY;

    this.targetSpherical.theta -=
      deltaX * this.options.rotateSpeed;

    this.targetSpherical.phi -=
      deltaY * this.options.rotateSpeed;

    this.clampSpherical();
  }

  onPointerUp(event) {
    if (this.pointerId !== event.pointerId) return;

    this.pointerId = null;
    this.isRotating = false;
  }

  onWheel(event) {
    if (!this.enabled || this.disposed) return;

    event.preventDefault();

    const factor = Math.exp(
      event.deltaY * this.options.zoomSpeed
    );

    this.targetSpherical.radius *= factor;

    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius,
      this.options.minDistance,
      this.options.maxDistance
    );
  }

  clampSpherical() {
    this.targetSpherical.phi = THREE.MathUtils.clamp(
      this.targetSpherical.phi,
      this.options.minPolarAngle,
      this.options.maxPolarAngle
    );

    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius,
      this.options.minDistance,
      this.options.maxDistance
    );
  }

  update() {
    if (this.disposed) return;

    const damping = this.options.damping;

    this.currentSpherical.radius = THREE.MathUtils.lerp(
      this.currentSpherical.radius,
      this.targetSpherical.radius,
      damping
    );

    this.currentSpherical.phi = THREE.MathUtils.lerp(
      this.currentSpherical.phi,
      this.targetSpherical.phi,
      damping
    );

    let thetaDifference =
      this.targetSpherical.theta -
      this.currentSpherical.theta;

    thetaDifference = Math.atan2(
      Math.sin(thetaDifference),
      Math.cos(thetaDifference)
    );

    this.currentSpherical.theta +=
      thetaDifference * damping;

    const offset = new THREE.Vector3()
      .setFromSpherical(this.currentSpherical);

    this.camera.position.copy(
      this.target.clone().add(offset)
    );

    this.camera.lookAt(this.target);
  }

  setView(view = "classic", immediate = false) {
    if (this.disposed) return false;

    const preset = CAMERA_PRESETS[view];

    if (!preset) return false;

    this.target.set(...preset.target);

    const position = new THREE.Vector3(
      ...preset.position
    );

    const offset = position.sub(this.target);

    const spherical = new THREE.Spherical()
      .setFromVector3(offset);

    this.targetSpherical.copy(spherical);
    this.clampSpherical();

    if (immediate) {
      this.currentSpherical.copy(
        this.targetSpherical
      );

      this.update();
    }

    return true;
  }

  // Compatibility with ThreeChessEngine
  setPreset(view = "classic") {
    return this.setView(view, false);
  }

  zoom(factor = 1) {
    if (this.disposed || !Number.isFinite(factor)) {
      return false;
    }

    this.targetSpherical.radius *= factor;

    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius,
      this.options.minDistance,
      this.options.maxDistance
    );

    return true;
  }

  rotate(horizontal = 0, vertical = 0) {
    if (this.disposed) return false;

    this.targetSpherical.theta += horizontal;
    this.targetSpherical.phi += vertical;

    this.clampSpherical();

    return true;
  }

  reset() {
    return this.setView("classic", true);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);

    if (!this.enabled) {
      this.pointerId = null;
      this.isRotating = false;
    }
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;

    this.element.removeEventListener(
      "pointerdown",
      this.boundPointerDown
    );

    this.element.removeEventListener(
      "pointermove",
      this.boundPointerMove
    );

    this.element.removeEventListener(
      "pointerup",
      this.boundPointerUp
    );

    this.element.removeEventListener(
      "pointercancel",
      this.boundPointerUp
    );

    this.element.removeEventListener(
      "wheel",
      this.boundWheel
    );

    this.element.removeEventListener(
      "contextmenu",
      this.boundContextMenu
    );

    this.pointerId = null;
    this.isRotating = false;
  }
}

export function createChessCameraController(
  camera,
  element,
  options = {}
) {
  return new ChessCameraController(
    camera,
    element,
    options
  );
}

/* =========================================================
   FILE COMPLETE
   PATH: js/3d/camera-controller.js
   ========================================================= */
