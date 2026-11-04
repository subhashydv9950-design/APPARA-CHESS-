
import * as THREE from "three";

export const EFFECT_TYPES = {
  SELECTION: "selection",
  LEGAL_MOVE: "legal-move",
  LAST_MOVE: "last-move",
  CAPTURE: "capture",
  CHECK: "check",
  CHECKMATE: "checkmate",
  VICTORY: "victory",
  DEFEAT: "defeat",
  LEVEL_UP: "level-up",
  PARTICLES: "particles",
  GLOW: "glow",
  CUSTOM: "custom"
};

export const EFFECT_PALETTES = {
  GOLD: {
    primary: 0xffd36e,
    secondary: 0xffa62b,
    glow: 0xffe7a6
  },

  PURPLE: {
    primary: 0xb47aff,
    secondary: 0x7139cf,
    glow: 0xe1c1ff
  },

  BLUE: {
    primary: 0x65caff,
    secondary: 0x2879df,
    glow: 0xb6edff
  },

  RED: {
    primary: 0xff5368,
    secondary: 0xc71943,
    glow: 0xffb1bd
  },

  GREEN: {
    primary: 0x70e5ae,
    secondary: 0x249b70,
    glow: 0xb9ffdc
  }
};

const DEFAULT_OPTIONS = {
  enabled: true,
  quality: "high",
  maxParticles: 500,
  particleSize: 0.075,
  particleLifetime: 1.5,
  reducedMotion: false
};

export class EffectsManager {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.root = new THREE.Group();
    this.root.name = "APPARA_CHESS_EFFECTS";

    this.scene?.add(this.root);

    this.effects = new Map();
    this.particleSystems = new Map();
    this.temporaryObjects = new Set();

    this.nextId = 1;
    this.disposed = false;

    this.stats = {
      activeEffects: 0,
      activeParticles: 0
    };

    this.clock = new THREE.Clock();
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error(
        "EffectsManager has already been disposed."
      );
    }
  }

  createId(type) {
    return `appa-effect-${type}-${this.nextId++}`;
  }

  getQualityMultiplier() {
    const values = {
      low: 0.35,
      medium: 0.6,
      high: 1,
      ultra: 1.4
    };

    return values[this.options.quality] || 1;
  }

  getParticleLimit() {
    if (this.options.reducedMotion) return 0;

    return Math.floor(
      this.options.maxParticles *
      this.getQualityMultiplier()
    );
  }

  createMaterial(color, options = {}) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      ...options
    });
  }

  addTemporaryObject(object) {
    this.root.add(object);
    this.temporaryObjects.add(object);
    return object;
  }

  removeTemporaryObject(object) {
    if (!object) return;

    object.removeFromParent();

    object.traverse(child => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach(material => {
          material.dispose();
        });
      }
    });

    this.temporaryObjects.delete(object);
  }

  createRing(position, options = {}) {
    this.ensureActive();

    const radius = options.radius ?? 0.48;
    const color = options.color ?? 0xffd36e;

    const geometry = new THREE.RingGeometry(
      radius * 0.82,
      radius,
      64
    );

    const material = this.createMaterial(color, {
      opacity: options.opacity ?? 0.9
    });

    const ring = new THREE.Mesh(
      geometry,
      material
    );

    ring.name = "Chess_Effect_Ring";

    ring.rotation.x = -Math.PI / 2;

    ring.position.set(
      position.x ?? 0,
      position.y ?? 0.12,
      position.z ?? 0
    );

    this.addTemporaryObject(ring);

    return ring;
  }

  createSelectionEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    const ring = this.createRing(position, {
      color: options.color ?? EFFECT_PALETTES.GOLD.primary,
      radius: options.radius ?? 0.48
    });

    const id = this.createId("selection");

    this.effects.set(id, {
      id,
      type: EFFECT_TYPES.SELECTION,
      object: ring,
      elapsed: 0,
      duration: options.duration ?? 1.2,
      update: (object, progress, elapsed) => {
        const pulse =
          1 + Math.sin(elapsed * 7) * 0.08;

        object.scale.setScalar(pulse);
        object.material.opacity =
          0.65 + Math.sin(elapsed * 7) * 0.25;
      }
    });

    this.updateStats();

    return id;
  }

  createLegalMoveEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    const geometry = new THREE.CircleGeometry(
      options.radius ?? 0.13,
      32
    );

    const material = this.createMaterial(
      options.color ?? EFFECT_PALETTES.GREEN.primary,
      {
        opacity: 0.8
      }
    );

    const marker = new THREE.Mesh(
      geometry,
      material
    );

    marker.name = "Legal_Move_Marker";
    marker.rotation.x = -Math.PI / 2;

    marker.position.set(
      position.x ?? 0,
      (position.y ?? 0) + 0.09,
      position.z ?? 0
    );

    this.addTemporaryObject(marker);

    const id = this.createId("legal");

    this.effects.set(id, {
      id,
      type: EFFECT_TYPES.LEGAL_MOVE,
      object: marker,
      elapsed: 0,
      duration: options.duration ?? 2,
      update: (object, progress, elapsed) => {
        const pulse =
          0.85 + Math.sin(elapsed * 5) * 0.12;

        object.scale.setScalar(pulse);
      }
    });

    this.updateStats();

    return id;
  }

  createLastMoveEffect(from, to, options = {}) {
    if (!this.options.enabled) return [];

    const first = this.createRing(from, {
      color: options.color ?? EFFECT_PALETTES.BLUE.primary,
      radius: options.radius ?? 0.42,
      opacity: 0.48
    });

    const second = this.createRing(to, {
      color: options.color ?? EFFECT_PALETTES.BLUE.primary,
      radius: options.radius ?? 0.42,
      opacity: 0.7
    });

    return [
      this.registerSimpleEffect(
        "last-move-from",
        first,
        options.duration ?? 2
      ),
      this.registerSimpleEffect(
        "last-move-to",
        second,
        options.duration ?? 2
      )
    ];
  }

  registerSimpleEffect(type, object, duration = 1) {
    const id = this.createId(type);

    this.effects.set(id, {
      id,
      type,
      object,
      elapsed: 0,
      duration,
      update: (target, progress) => {
        target.material.opacity =
          0.8 * (1 - progress);
      }
    });

    this.updateStats();

    return id;
  }

  createParticleSystem(position, options = {}) {
    this.ensureActive();

    if (!this.options.enabled) return null;

    const requestedCount = options.count ?? 40;

    const count = Math.max(
      0,
      Math.min(
        requestedCount,
        this.getParticleLimit() -
          this.stats.activeParticles
      )
    );

    if (count <= 0) return null;

    const palette = options.palette ||
      EFFECT_PALETTES.GOLD;

    const colors = [
      palette.primary,
      palette.secondary,
      palette.glow
    ];

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const index = i * 3;

      positions[index] = position.x ?? 0;
      positions[index + 1] = position.y ?? 0;
      positions[index + 2] = position.z ?? 0;

      velocities[index] =
        (Math.random() - 0.5) *
        (options.spread ?? 3);

      velocities[index + 1] =
        Math.random() *
        (options.speed ?? 3);

      velocities[index + 2] =
        (Math.random() - 0.5) *
        (options.spread ?? 3);

      const color = new THREE.Color(
        colors[i % colors.length]
      );

      particleColors[index] = color.r;
      particleColors[index + 1] = color.g;
      particleColors[index + 2] = color.b;

      sizes[i] =
        options.size ??
        this.options.particleSize;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(sizes, 1)
    );

    const material = new THREE.PointsMaterial({
      size: options.size ?? this.options.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const points = new THREE.Points(
      geometry,
      material
    );

    points.name = "Chess_Particle_System";

    this.addTemporaryObject(points);

    const id = this.createId("particles");

    const system = {
      id,
      points,
      geometry,
      material,
      velocities,
      count,
      elapsed: 0,
      duration:
        options.lifetime ??
        this.options.particleLifetime,
      gravity: options.gravity ?? 2.5,
      drag: options.drag ?? 0.985,
      initialPosition: new THREE.Vector3(
        position.x ?? 0,
        position.y ?? 0,
        position.z ?? 0
      )
    };

    this.particleSystems.set(id, system);

    this.stats.activeParticles += count;
    this.updateStats();

    return id;
  }

  createCaptureEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    const id = this.createParticleSystem(
      position,
      {
        count: options.count ?? 65,
        palette: EFFECT_PALETTES.GOLD,
        speed: 4,
        spread: 4,
        lifetime: 0.9,
        gravity: 2
      }
    );

    const ring = this.createRing(position, {
      radius: 0.25,
      color: EFFECT_PALETTES.GOLD.primary
    });

    const ringId = this.registerSimpleEffect(
      "capture-ring",
      ring,
      0.65
    );

    return {
      particles: id,
      ring: ringId
    };
  }

  createCheckEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    const ring = this.createRing(position, {
      radius: 0.6,
      color: EFFECT_PALETTES.RED.primary
    });

    const id = this.createId("check");

    this.effects.set(id, {
      id,
      type: EFFECT_TYPES.CHECK,
      object: ring,
      elapsed: 0,
      duration: options.duration ?? 2.5,
      update: (object, progress, elapsed) => {
        const pulse =
          1 + Math.sin(elapsed * 9) * 0.13;

        object.scale.setScalar(pulse);

        object.material.opacity =
          0.7 + Math.sin(elapsed * 9) * 0.2;
      }
    });

    this.updateStats();

    return id;
  }

  createCheckmateEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    const particles = this.createParticleSystem(
      position,
      {
        count: options.count ?? 130,
        palette: EFFECT_PALETTES.RED,
        speed: 5,
        spread: 5,
        lifetime: 2,
        gravity: 1.8
      }
    );

    const ring = this.createRing(position, {
      radius: 0.8,
      color: EFFECT_PALETTES.RED.primary
    });

    const ringId = this.registerSimpleEffect(
      "checkmate-ring",
      ring,
      1.4
    );

    return {
      particles,
      ring: ringId
    };
  }

  createVictoryEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    return this.createParticleSystem(
      position,
      {
        count: options.count ?? 180,
        palette: EFFECT_PALETTES.GOLD,
        speed: 5,
        spread: 8,
        lifetime: 2.8,
        gravity: 1.2,
        size: 0.09
      }
    );
  }

  createDefeatEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    return this.createParticleSystem(
      position,
      {
        count: options.count ?? 70,
        palette: EFFECT_PALETTES.PURPLE,
        speed: 2,
        spread: 3,
        lifetime: 1.7,
        gravity: 3
      }
    );
  }

  createLevelUpEffect(position, options = {}) {
    if (!this.options.enabled) return null;

    return this.createParticleSystem(
      position,
      {
        count: options.count ?? 150,
        palette: EFFECT_PALETTES.BLUE,
        speed: 5,
        spread: 5,
        lifetime: 2.2,
        gravity: 0.8
      }
    );
  }

  createGlow(object, options = {}) {
    if (!this.options.enabled || !object) return null;

    const id = this.createId("glow");

    const originalMaterials = [];

    object.traverse(child => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach(material => {
        if (!material.emissive) return;

        originalMaterials.push({
          material,
          emissive: material.emissive.clone(),
          intensity: material.emissiveIntensity
        });

        material.emissive.set(
          options.color ?? 0xffd36e
        );

        material.emissiveIntensity =
          options.intensity ?? 0.7;
      });
    });

    this.effects.set(id, {
      id,
      type: EFFECT_TYPES.GLOW,
      object,
      elapsed: 0,
      duration: options.duration ?? 1.5,
      update: (target, progress, elapsed) => {
        const pulse =
          0.55 + Math.sin(elapsed * 6) * 0.25;

        originalMaterials.forEach(item => {
          item.material.emissiveIntensity =
            pulse * (options.intensity ?? 0.7);
        });
      },

      onRemove: () => {
        originalMaterials.forEach(item => {
          item.material.emissive.copy(
            item.emissive
          );

          item.material.emissiveIntensity =
            item.intensity;
        });
      }
    });

    this.updateStats();

    return id;
  }

  removeEffect(id) {
    const effect = this.effects.get(id);

    if (effect) {
      effect.onRemove?.();

      if (
        effect.object &&
        this.temporaryObjects.has(effect.object)
      ) {
        this.removeTemporaryObject(effect.object);
      }

      this.effects.delete(id);
    }

    const particleSystem =
      this.particleSystems.get(id);

    if (particleSystem) {
      this.removeParticleSystem(id);
    }

    this.updateStats();

    return Boolean(effect || particleSystem);
  }

  removeParticleSystem(id) {
    const system = this.particleSystems.get(id);

    if (!system) return false;

    this.removeTemporaryObject(system.points);

    this.stats.activeParticles = Math.max(
      0,
      this.stats.activeParticles - system.count
    );

    this.particleSystems.delete(id);

    this.updateStats();

    return true;
  }

  updateParticles(deltaTime) {
    const delta = Math.min(
      Math.max(deltaTime, 0),
      0.05
    );

    const finished = [];

    for (const [id, system] of this.particleSystems) {
      system.elapsed += delta;

      const positions =
        system.geometry.attributes.position;

      const lifeProgress = Math.min(
        1,
        system.elapsed / system.duration
      );

      for (let i = 0; i < system.count; i++) {
        const index = i * 3;

        system.velocities[index] *=
          Math.pow(system.drag, delta * 60);

        system.velocities[index + 1] -=
          system.gravity * delta;

        system.velocities[index + 2] *=
          Math.pow(system.drag, delta * 60);

        positions.array[index] +=
          system.velocities[index] * delta;

        positions.array[index + 1] +=
          system.velocities[index + 1] * delta;

        positions.array[index + 2] +=
          system.velocities[index + 2] * delta;
      }

      positions.needsUpdate = true;

      system.material.opacity =
        1 - lifeProgress;

      if (lifeProgress >= 1) {
        finished.push(id);
      }
    }

    finished.forEach(id => {
      this.removeParticleSystem(id);
    });
  }

  update(deltaTime) {
    if (
      this.disposed ||
      !this.options.enabled
    ) {
      return;
    }

    const delta = Math.min(
      Math.max(deltaTime, 0),
      0.05
    );

    this.updateParticles(delta);

    const finished = [];

    for (const [id, effect] of this.effects) {
      effect.elapsed += delta;

      const progress = Math.min(
        1,
        effect.elapsed / effect.duration
      );

      effect.update?.(
        effect.object,
        progress,
        effect.elapsed
      );

      if (progress >= 1) {
        finished.push(id);
      }
    }

    finished.forEach(id => {
      this.removeEffect(id);
    });

    this.updateStats();
  }

  updateStats() {
    this.stats.activeEffects =
      this.effects.size +
      this.particleSystems.size;
  }

  setEnabled(enabled) {
    this.options.enabled = Boolean(enabled);

    if (!enabled) {
      this.clearAll();
    }
  }

  setQuality(quality) {
    const allowed = [
      "low",
      "medium",
      "high",
      "ultra"
    ];

    if (!allowed.includes(quality)) {
      throw new Error(
        `Unsupported effects quality: ${quality}`
      );
    }

    this.options.quality = quality;
  }

  setReducedMotion(enabled) {
    this.options.reducedMotion = Boolean(enabled);

    if (enabled) {
      this.clearAll();
    }
  }

  clearAll() {
    Array.from(this.effects.keys()).forEach(id => {
      this.removeEffect(id);
    });

    Array.from(this.particleSystems.keys()).forEach(id => {
      this.removeParticleSystem(id);
    });

    this.temporaryObjects.forEach(object => {
      this.removeTemporaryObject(object);
    });

    this.effects.clear();
    this.particleSystems.clear();

    this.stats.activeParticles = 0;
    this.updateStats();
  }

  getStats() {
    return {
      ...this.stats,
      enabled: this.options.enabled,
      quality: this.options.quality,
      reducedMotion: this.options.reducedMotion
    };
  }

  dispose() {
    if (this.disposed) return;

    this.clearAll();

    this.root.removeFromParent();

    this.clock.stop();

    this.disposed = true;
  }
}

export function createEffectsManager(scene, options = {}) {
  return new EffectsManager(scene, options);
}

// FILE 33 END — effects-manager.js
        
