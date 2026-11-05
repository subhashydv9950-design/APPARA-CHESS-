
import * as THREE from "three";

export class ChessAnimationController {
  constructor(options = {}) {
    this.options = {
      moveDuration: 420,
      captureDuration: 220,
      hopHeight: 0.32,
      ...options
    };

    this.animations = new Map();
    this.clock = new THREE.Clock();
    this.disposed = false;
  }

  movePiece(piece, destination, options = {}) {
    if (this.disposed || !piece || !destination) {
      return Promise.resolve(false);
    }

    const duration = options.duration ?? this.options.moveDuration;
    const hopHeight = options.hopHeight ?? this.options.hopHeight;

    this.cancel(piece);

    const start = piece.position.clone();
    const end = new THREE.Vector3(
      destination.x,
      destination.y,
      destination.z
    );

    return new Promise(resolve => {
      this.animations.set(piece, {
        type: "move",
        start,
        end,
        duration,
        elapsed: 0,
        hopHeight,
        resolve
      });
    });
  }

  capturePiece(piece, options = {}) {
    if (this.disposed || !piece) {
      return Promise.resolve(false);
    }

    const duration = options.duration ?? this.options.captureDuration;

    this.cancel(piece);

    const startScale = piece.scale.clone();

    return new Promise(resolve => {
      this.animations.set(piece, {
        type: "capture",
        startScale,
        duration,
        elapsed: 0,
        resolve
      });
    });
  }

  update(deltaSeconds) {
    if (this.disposed || this.animations.size === 0) {
      return;
    }

    const delta = Math.min(
      Math.max(deltaSeconds, 0),
      0.05
    );

    for (const [piece, animation] of this.animations) {
      animation.elapsed += delta * 1000;

      const progress = Math.min(
        animation.elapsed / animation.duration,
        1
      );

      const eased = this.easeInOutCubic(progress);

      if (animation.type === "move") {
        this.updateMove(piece, animation, eased, progress);
      }

      if (animation.type === "capture") {
        this.updateCapture(piece, animation, eased);
      }

      if (progress >= 1) {
        this.finish(piece, animation);
      }
    }
  }

  updateMove(piece, animation, eased, progress) {
    const { start, end, hopHeight } = animation;

    piece.position.x = THREE.MathUtils.lerp(
      start.x,
      end.x,
      eased
    );

    piece.position.z = THREE.MathUtils.lerp(
      start.z,
      end.z,
      eased
    );

    const baseY = THREE.MathUtils.lerp(
      start.y,
      end.y,
      eased
    );

    const hop = Math.sin(progress * Math.PI) * hopHeight;

    piece.position.y = baseY + hop;
  }

  updateCapture(piece, animation, eased) {
    const scale = 1 - eased;

    piece.scale.set(
      animation.startScale.x * scale,
      animation.startScale.y * scale,
      animation.startScale.z * scale
    );

    piece.rotation.y += 0.025;
  }

  finish(piece, animation) {
    if (animation.type === "move") {
      piece.position.copy(animation.end);
    }

    if (animation.type === "capture") {
      piece.scale.set(0, 0, 0);
    }

    this.animations.delete(piece);
    animation.resolve(true);
  }

  cancel(piece) {
    const animation = this.animations.get(piece);

    if (!animation) return false;

    this.animations.delete(piece);
    animation.resolve(false);

    return true;
  }

  cancelAll() {
    for (const [piece, animation] of this.animations) {
      animation.resolve(false);
    }

    this.animations.clear();
  }

  isAnimating(piece) {
    return this.animations.has(piece);
  }

  easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  dispose() {
    if (this.disposed) return;

    this.cancelAll();
    this.disposed = true;
  }
}

export function createChessAnimationController(options = {}) {
  return new ChessAnimationController(options);
}

/* APPARA CHESS — ANIMATION CONTROLLER COMPLETE */
