
import * as THREE from "three";

export const ANIMATION_TYPES = {
  MOVE: "move",
  CAPTURE: "capture",
  SELECT: "select",
  DESELECT: "deselect",
  HIGHLIGHT: "highlight",
  VICTORY: "victory",
  DEFEAT: "defeat",
  APPEAR: "appear",
  DISAPPEAR: "disappear",
  CAMERA: "camera",
  CUSTOM: "custom"
};

export const EASING = {
  LINEAR: t => t,

  EASE_IN: t => t * t,

  EASE_OUT: t => 1 - (1 - t) * (1 - t),

  EASE_IN_OUT: t =>
    t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2,

  SMOOTH: t =>
    t * t * (3 - 2 * t),

  BACK_OUT: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(t - 1, 3) +
      c1 * Math.pow(t - 1, 2);
  },

  BOUNCE_OUT: t => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    }

    if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    }

    if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    }

    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

const DEFAULT_OPTIONS = {
  defaultDuration: 450,
  moveDuration: 380,
  captureDuration: 520,
  selectDuration: 180,
  enableAnimations: true,
  reducedMotion: false
};

export class AnimationManager {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.animations = new Map();
    this.completedAnimations = new Set();

    this.nextId = 1;
    this.paused = false;
    this.disposed = false;

    this.clock = new THREE.Clock();

    this.stats = {
      active: 0,
      completed: 0,
      cancelled: 0
    };
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error(
        "AnimationManager has already been disposed."
      );
    }
  }

  createId() {
    return `appa-animation-${this.nextId++}`;
  }

  getDuration(duration) {
    if (this.options.reducedMotion) {
      return 1;
    }

    return Math.max(
      1,
      duration ?? this.options.defaultDuration
    );
  }

  getEasing(easing) {
    if (typeof easing === "function") {
      return easing;
    }

    return EASING[easing] || EASING.EASE_IN_OUT;
  }

  addAnimation(config = {}) {
    this.ensureActive();

    if (!this.options.enableAnimations) {
      config.onUpdate?.(1);
      config.onComplete?.();

      return null;
    }

    const id = config.id || this.createId();

    if (this.animations.has(id)) {
      this.cancel(id);
    }

    const animation = {
      id,

      duration: this.getDuration(config.duration),

      elapsed: 0,

      progress: 0,

      easing: this.getEasing(config.easing),

      onUpdate: config.onUpdate || null,

      onComplete: config.onComplete || null,

      onCancel: config.onCancel || null,

      start: config.start || null,

      end: config.end || null,

      data: config.data || {},

      completed: false
    };

    animation.start?.();

    this.animations.set(id, animation);
    this.stats.active = this.animations.size;

    return id;
  }

  update(deltaTime) {
    if (
      this.disposed ||
      this.paused ||
      !this.options.enableAnimations
    ) {
      return;
    }

    const delta = Math.max(
      0,
      Math.min(deltaTime, 0.1)
    ) * 1000;

    const finished = [];

    for (const [id, animation] of this.animations) {
      animation.elapsed += delta;

      const rawProgress = Math.min(
        1,
        animation.elapsed / animation.duration
      );

      const easedProgress = animation.easing(
        rawProgress
      );

      animation.progress = rawProgress;

      try {
        animation.onUpdate?.(
          easedProgress,
          rawProgress,
          animation
        );
      } catch (error) {
        console.error(
          `Animation update failed: ${id}`,
          error
        );

        finished.push(id);
        continue;
      }

      if (rawProgress >= 1) {
        finished.push(id);
      }
    }

    finished.forEach(id => {
      this.complete(id);
    });

    this.stats.active = this.animations.size;
  }

  complete(id) {
    const animation = this.animations.get(id);

    if (!animation) return false;

    animation.completed = true;

    this.animations.delete(id);

    this.completedAnimations.add(id);

    this.stats.completed += 1;
    this.stats.active = this.animations.size;

    try {
      animation.end?.();
      animation.onComplete?.();
    } catch (error) {
      console.error(
        `Animation completion failed: ${id}`,
        error
      );
    }

    return true;
  }

  cancel(id) {
    const animation = this.animations.get(id);

    if (!animation) return false;

    this.animations.delete(id);

    this.stats.cancelled += 1;
    this.stats.active = this.animations.size;

    try {
      animation.onCancel?.();
    } catch (error) {
      console.error(
        `Animation cancellation failed: ${id}`,
        error
      );
    }

    return true;
  }

  cancelAll() {
    const ids = Array.from(
      this.animations.keys()
    );

    ids.forEach(id => this.cancel(id));
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setReducedMotion(enabled) {
    this.options.reducedMotion = Boolean(enabled);

    if (enabled) {
      const ids = Array.from(
        this.animations.keys()
      );

      ids.forEach(id => {
        const animation = this.animations.get(id);

        if (!animation) return;

        animation.onUpdate?.(1, 1, animation);
        this.complete(id);
      });
    }
  }

  setEnabled(enabled) {
    this.options.enableAnimations = Boolean(enabled);

    if (!enabled) {
      this.cancelAll();
    }
  }

  getStats() {
    return {
      ...this.stats,
      active: this.animations.size,
      paused: this.paused,
      enabled: this.options.enableAnimations,
      reducedMotion: this.options.reducedMotion
    };
  }

  animateVector3(object, property, target, options = {}) {
    this.ensureActive();

    if (!object || !object[property]?.isVector3) {
      throw new TypeError(
        `Object property "${property}" must be a THREE.Vector3.`
      );
    }

    const vector = object[property];

    const from = vector.clone();

    const to = target instanceof THREE.Vector3
      ? target.clone()
      : new THREE.Vector3(
          target.x ?? vector.x,
          target.y ?? vector.y,
          target.z ?? vector.z
        );

    return this.addAnimation({
      duration: options.duration ?? this.options.defaultDuration,
      easing: options.easing || "EASE_IN_OUT",

      onUpdate: progress => {
        vector.lerpVectors(from, to, progress);
      },

      onComplete: options.onComplete
    });
  }

  animateScale(object, targetScale, options = {}) {
    this.ensureActive();

    if (!object?.scale?.isVector3) {
      throw new TypeError(
        "A THREE.Object3D with scale is required."
      );
    }

    const from = object.scale.clone();

    const to = typeof targetScale === "number"
      ? new THREE.Vector3(
          targetScale,
          targetScale,
          targetScale
        )
      : new THREE.Vector3(
          targetScale.x ?? from.x,
          targetScale.y ?? from.y,
          targetScale.z ?? from.z
        );

    return this.addAnimation({
      duration: options.duration ?? this.options.defaultDuration,
      easing: options.easing || "BACK_OUT",

      onUpdate: progress => {
        object.scale.lerpVectors(from, to, progress);
      },

      onComplete: options.onComplete
    });
  }

  animateRotation(object, targetRotation, options = {}) {
    this.ensureActive();

    if (!object?.rotation) {
      throw new TypeError(
        "A THREE.Object3D is required."
      );
    }

    const from = new THREE.Euler(
      object.rotation.x,
      object.rotation.y,
      object.rotation.z,
      object.rotation.order
    );

    const to = new THREE.Euler(
      targetRotation.x ?? from.x,
      targetRotation.y ?? from.y,
      targetRotation.z ?? from.z,
      targetRotation.order || from.order
    );

    const fromQuaternion = new THREE.Quaternion()
      .setFromEuler(from);

    const toQuaternion = new THREE.Quaternion()
      .setFromEuler(to);

    const current = new THREE.Quaternion();

    return this.addAnimation({
      duration: options.duration ?? this.options.defaultDuration,
      easing: options.easing || "EASE_IN_OUT",

      onUpdate: progress => {
        current.slerpQuaternions(
          fromQuaternion,
          toQuaternion,
          progress
        );

        object.quaternion.copy(current);
      },

      onComplete: options.onComplete
    });
  }

  animatePieceMove(piece, destination, options = {}) {
    this.ensureActive();

    if (!piece?.position?.isVector3) {
      throw new TypeError(
        "A 3D chess piece is required."
      );
    }

    const start = piece.position.clone();

    const end = destination instanceof THREE.Vector3
      ? destination.clone()
      : new THREE.Vector3(
          destination.x ?? start.x,
          destination.y ?? start.y,
          destination.z ?? start.z
        );

    const liftHeight = options.liftHeight ?? 0.65;

    const duration =
      options.duration ?? this.options.moveDuration;

    const peak = Math.max(
      start.y,
      end.y
    ) + liftHeight;

    const startScale = piece.scale.clone();

    return this.addAnimation({
      duration,
      easing: "EASE_IN_OUT",

      onUpdate: progress => {
        const horizontal = new THREE.Vector3()
          .lerpVectors(start, end, progress);

        const lift = Math.sin(
          progress * Math.PI
        ) * liftHeight;

        piece.position.set(
          horizontal.x,
          horizontal.y + lift,
          horizontal.z
        );

        if (options.rotate !== false) {
          piece.rotation.y +=
            options.rotationSpeed ?? 0.035;
        }
      },

      onComplete: () => {
        piece.position.copy(end);
        piece.scale.copy(startScale);

        options.onComplete?.();
      }
    });
  }

  animateCapture(piece, options = {}) {
    this.ensureActive();

    if (!piece) return null;

    const startScale = piece.scale.clone();
    const startPosition = piece.position.clone();

    return this.addAnimation({
      duration: options.duration ?? this.options.captureDuration,
      easing: "EASE_IN",

      onUpdate: progress => {
        const scale = Math.max(
          0,
          1 - progress
        );

        piece.scale.set(
          startScale.x * scale,
          startScale.y * scale,
          startScale.z * scale
        );

        piece.position.y =
          startPosition.y +
          Math.sin(progress * Math.PI) * 0.45;
      },

      onComplete: () => {
        options.onComplete?.(piece);
      },

      onCancel: () => {
        piece.scale.copy(startScale);
        piece.position.copy(startPosition);
      }
    });
  }

  animateSelection(piece, selected = true, options = {}) {
    if (!piece?.scale?.isVector3) return null;

    const baseScale = piece.userData.baseScale
      ? piece.userData.baseScale.clone()
      : piece.scale.clone();

    piece.userData.baseScale = baseScale.clone();

    const target = selected
      ? baseScale.clone().multiplyScalar(
          options.scale ?? 1.12
        )
      : baseScale;

    return this.animateScale(
      piece,
      target,
      {
        duration: options.duration ?? this.options.selectDuration,
        easing: "BACK_OUT",
        onComplete: options.onComplete
      }
    );
  }

  animateAppear(object, options = {}) {
    if (!object) return null;

    const targetScale = object.scale.clone();

    object.scale.setScalar(0);

    return this.animateScale(
      object,
      targetScale,
      {
        duration: options.duration ?? 400,
        easing: "BACK_OUT",
        onComplete: options.onComplete
      }
    );
  }

  animateDisappear(object, options = {}) {
    if (!object) return null;

    const startScale = object.scale.clone();

    return this.addAnimation({
      duration: options.duration ?? 300,
      easing: "EASE_IN",

      onUpdate: progress => {
        object.scale.set(
          startScale.x * (1 - progress),
          startScale.y * (1 - progress),
          startScale.z * (1 - progress)
        );
      },

      onComplete: () => {
        options.onComplete?.(object);
      }
    });
  }

  animateOpacity(object, targetOpacity, options = {}) {
    if (!object) return null;

    const meshes = [];

    object.traverse(child => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach(material => {
        if (material.opacity === undefined) return;

        meshes.push({
          material,
          start: material.opacity,
          transparent: material.transparent
        });

        material.transparent = true;
        material.needsUpdate = true;
      });
    });

    return this.addAnimation({
      duration: options.duration ?? 400,
      easing: options.easing || "EASE_IN_OUT",

      onUpdate: progress => {
        meshes.forEach(item => {
          item.material.opacity =
            item.start +
            (targetOpacity - item.start) * progress;
        });
      },

      onComplete: () => {
        meshes.forEach(item => {
          item.material.transparent =
            targetOpacity < 1
              ? true
              : item.transparent;

          item.material.needsUpdate = true;
        });

        options.onComplete?.();
      }
    });
  }

  animateCamera(camera, targetPosition, targetLookAt, options = {}) {
    if (!camera?.position?.isVector3) return null;

    const startPosition = camera.position.clone();

    const endPosition = targetPosition instanceof THREE.Vector3
      ? targetPosition.clone()
      : new THREE.Vector3(
          targetPosition.x,
          targetPosition.y,
          targetPosition.z
        );

    const startTarget = options.currentLookAt
      ? options.currentLookAt.clone()
      : new THREE.Vector3(0, 0, 0);

    const endTarget = targetLookAt instanceof THREE.Vector3
      ? targetLookAt.clone()
      : new THREE.Vector3(
          targetLookAt.x ?? 0,
          targetLookAt.y ?? 0,
          targetLookAt.z ?? 0
        );

    const currentTarget = new THREE.Vector3();

    return this.addAnimation({
      duration: options.duration ?? 900,
      easing: "EASE_IN_OUT",

      onUpdate: progress => {
        camera.position.lerpVectors(
          startPosition,
          endPosition,
          progress
        );

        currentTarget.lerpVectors(
          startTarget,
          endTarget,
          progress
        );

        camera.lookAt(currentTarget);
      },

      onComplete: options.onComplete
    });
  }

  animateVictory(object, options = {}) {
    if (!object) return null;

    const startY = object.position.y;
    const startRotation = object.rotation.y;

    const duration = options.duration ?? 1800;

    return this.addAnimation({
      duration,
      easing: "EASE_OUT",

      onUpdate: progress => {
        object.position.y =
          startY +
          Math.sin(progress * Math.PI * 4) *
          (options.bounceHeight ?? 0.25);

        object.rotation.y =
          startRotation +
          progress * Math.PI * 2;
      },

      onComplete: () => {
        object.position.y = startY;
        object.rotation.y = startRotation;

        options.onComplete?.();
      }
    });
  }

  dispose() {
    if (this.disposed) return;

    this.cancelAll();

    this.clock.stop();
    this.completedAnimations.clear();

    this.disposed = true;
  }
}

export function createAnimationManager(options = {}) {
  return new AnimationManager(options);
}

// FILE 32 END — animation-manager.js
      
