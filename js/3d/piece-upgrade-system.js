
/* =========================================================
   APPARA CHESS — FILE 27
   FILE PATH: js/3d/piece-upgrade-system.js

   PURPOSE:
   Seven visual upgrade levels for chess pieces.
   Royal decorations, gems, rings and special details.

   DEPENDENCY:
   Three.js + PieceModelFactory.
========================================================= */

import * as THREE from "three";
import { MATERIAL_PALETTE } from "./material-factory.js";

export const PIECE_UPGRADE_LEVELS = Object.freeze([
  {
    level: 1,
    name: "Classic",
    description: "Original royal design",
    scale: 1,
    ringCount: 0,
    gemCount: 0,
    decorationCount: 0,
    glow: false,
    cost: 0
  },
  {
    level: 2,
    name: "Polished",
    description: "Polished gold details",
    scale: 1.015,
    ringCount: 1,
    gemCount: 0,
    decorationCount: 2,
    glow: false,
    cost: 500
  },
  {
    level: 3,
    name: "Royal",
    description: "Royal metal decorations",
    scale: 1.025,
    ringCount: 2,
    gemCount: 1,
    decorationCount: 4,
    glow: false,
    cost: 1200
  },
  {
    level: 4,
    name: "Elite",
    description: "Premium gemstone edition",
    scale: 1.04,
    ringCount: 3,
    gemCount: 2,
    decorationCount: 6,
    glow: false,
    cost: 2500
  },
  {
    level: 5,
    name: "Legendary",
    description: "Legendary royal appearance",
    scale: 1.055,
    ringCount: 4,
    gemCount: 4,
    decorationCount: 8,
    glow: true,
    cost: 5000
  },
  {
    level: 6,
    name: "Mythic",
    description: "Mythic crystal decorations",
    scale: 1.07,
    ringCount: 5,
    gemCount: 6,
    decorationCount: 10,
    glow: true,
    cost: 10000
  },
  {
    level: 7,
    name: "Royal Legend",
    description: "Ultimate royal masterpiece",
    scale: 1.09,
    ringCount: 7,
    gemCount: 8,
    decorationCount: 14,
    glow: true,
    cost: 20000
  }
]);

export class PieceUpgradeSystem {
  constructor(options = {}) {
    this.pieceFactory = options.pieceFactory ?? null;

    this.unlockedLevels = new Map();
    this.appliedUpgrades = new Map();

    this.defaultLevel = 1;
    this.isDisposed = false;
  }

  getUpgradeConfig(level) {
    const safeLevel = THREE.MathUtils.clamp(
      Math.floor(Number(level) || 1),
      1,
      7
    );

    return PIECE_UPGRADE_LEVELS[safeLevel - 1];
  }

  registerPiece(pieceId, initialLevel = 1) {
    this.ensureActive();

    const level = this.normalizeLevel(initialLevel);

    this.unlockedLevels.set(pieceId, level);

    return {
      pieceId,
      unlockedLevel: level,
      currentLevel: 1
    };
  }

  normalizeLevel(level) {
    return THREE.MathUtils.clamp(
      Math.floor(Number(level) || 1),
      1,
      7
    );
  }

  getUnlockedLevel(pieceId) {
    return this.unlockedLevels.get(pieceId) ?? 1;
  }

  getCurrentLevel(pieceId) {
    return this.appliedUpgrades.get(pieceId)?.level ?? 1;
  }

  unlockLevel(pieceId, level) {
    this.ensureActive();

    const targetLevel = this.normalizeLevel(level);
    const currentLevel = this.getUnlockedLevel(pieceId);

    if (targetLevel <= currentLevel) {
      return {
        success: false,
        reason: "LEVEL_ALREADY_UNLOCKED"
      };
    }

    if (targetLevel !== currentLevel + 1) {
      return {
        success: false,
        reason: "UNLOCK_PREVIOUS_LEVEL_FIRST"
      };
    }

    this.unlockedLevels.set(pieceId, targetLevel);

    return {
      success: true,
      pieceId,
      unlockedLevel: targetLevel,
      cost: this.getUpgradeConfig(targetLevel).cost
    };
  }

  canApply(pieceId, level) {
    const targetLevel = this.normalizeLevel(level);
    const unlockedLevel = this.getUnlockedLevel(pieceId);

    return targetLevel <= unlockedLevel;
  }

  applyUpgrade(piece, level, options = {}) {
    this.ensureActive();

    if (!piece?.isObject3D) {
      throw new TypeError(
        "applyUpgrade requires a Three.js piece object."
      );
    }

    const pieceId = options.pieceId ??
      piece.userData.pieceId ??
      piece.uuid;

    const targetLevel = this.normalizeLevel(level);

    if (!this.canApply(pieceId, targetLevel)) {
      return {
        success: false,
        reason: "LEVEL_NOT_UNLOCKED"
      };
    }

    this.removeUpgradeVisuals(piece);

    const config = this.getUpgradeConfig(targetLevel);

    const upgradeGroup = new THREE.Group();
    upgradeGroup.name = "apparachess-upgrade-details";
    upgradeGroup.userData.isUpgradeGroup = true;

    if (targetLevel > 1) {
      this.addUpgradeRings(upgradeGroup, config);
      this.addUpgradeGems(upgradeGroup, config);
      this.addDecorations(upgradeGroup, config);

      if (config.glow) {
        this.addRoyalGlow(upgradeGroup, config);
      }
    }

    piece.add(upgradeGroup);

    piece.scale.setScalar(config.scale);

    piece.userData.upgradeLevel = targetLevel;
    piece.userData.upgradeName = config.name;

    this.appliedUpgrades.set(pieceId, {
      level: targetLevel,
      name: config.name,
      group: upgradeGroup
    });

    return {
      success: true,
      pieceId,
      level: targetLevel,
      name: config.name
    };
  }

  addUpgradeRings(group, config) {
    for (let i = 0; i < config.ringCount; i++) {
      const radius = 0.45 + i * 0.035;
      const height = 0.38 + i * 0.16;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.025, 10, 48),
        this.createGoldMaterial()
      );

      ring.name = `upgrade-ring-${i}`;
      ring.rotation.x = Math.PI / 2;
      ring.position.y = height;

      ring.castShadow = true;
      ring.receiveShadow = true;

      group.add(ring);
    }
  }

  addUpgradeGems(group, config) {
    const colors = [
      0x65caff,
      0xb51f48,
      0x16a477,
      0xffdf91
    ];

    for (let i = 0; i < config.gemCount; i++) {
      const angle = (i / config.gemCount) * Math.PI * 2;
      const radius = 0.43;
      const height = 0.72 + (i % 2) * 0.13;

      const gemMaterial = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        metalness: 0.1,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05
      });

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 1),
        gemMaterial
      );

      gem.name = `upgrade-gem-${i}`;

      gem.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      gem.castShadow = true;

      group.add(gem);
    }
  }

  addDecorations(group, config) {
    for (let i = 0; i < config.decorationCount; i++) {
      const angle = (i / config.decorationCount) * Math.PI * 2;

      const decoration = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        this.createGoldMaterial()
      );

      decoration.name = `upgrade-decoration-${i}`;

      decoration.position.set(
        Math.cos(angle) * 0.51,
        0.32 + (i % 3) * 0.14,
        Math.sin(angle) * 0.51
      );

      decoration.castShadow = true;

      group.add(decoration);
    }
  }

  addRoyalGlow(group, config) {
    const glowColor = config.level >= 7
      ? 0xffdf91
      : 0x65caff;

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.035, 12, 64),
      glowMaterial
    );

    glow.name = "royal-upgrade-glow";
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.15;

    group.add(glow);

    group.userData.hasRoyalGlow = true;
  }

  createGoldMaterial() {
    return new THREE.MeshStandardMaterial({
      color: MATERIAL_PALETTE.gold,
      metalness: 0.95,
      roughness: 0.18
    });
  }

  removeUpgradeVisuals(piece) {
    if (!piece) return;

    const oldGroup = piece.children.find(
      child => child.userData.isUpgradeGroup === true
    );

    if (!oldGroup) return;

    piece.remove(oldGroup);

    oldGroup.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach(material => material.dispose());
      }
    });
  }

  getUpgradeList(pieceId) {
    const unlocked = this.getUnlockedLevel(pieceId);
    const current = this.getCurrentLevel(pieceId);

    return PIECE_UPGRADE_LEVELS.map(config => ({
      ...config,
      unlocked: config.level <= unlocked,
      applied: config.level === current
    }));
  }

  getNextUpgrade(pieceId) {
    const unlocked = this.getUnlockedLevel(pieceId);

    if (unlocked >= 7) return null;

    return this.getUpgradeConfig(unlocked + 1);
  }

  getUpgradePrice(level) {
    return this.getUpgradeConfig(level).cost;
  }

  resetPiece(pieceId, piece = null) {
    if (piece) {
      this.removeUpgradeVisuals(piece);
      piece.scale.setScalar(1);
      delete piece.userData.upgradeLevel;
      delete piece.userData.upgradeName;
    }

    this.appliedUpgrades.delete(pieceId);

    return true;
  }

  ensureActive() {
    if (this.isDisposed) {
      throw new Error("PieceUpgradeSystem has been disposed.");
    }
  }

  dispose() {
    if (this.isDisposed) return;

    this.appliedUpgrades.clear();
    this.unlockedLevels.clear();

    this.pieceFactory = null;
    this.isDisposed = true;
  }
}

export function createPieceUpgradeSystem(options = {}) {
  return new PieceUpgradeSystem(options);
}

/* =========================================================
   FILE 27 END — piece-upgrade-system.js
========================================================= */
        
