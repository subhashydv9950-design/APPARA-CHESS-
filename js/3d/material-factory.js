
/* =========================================================
   APPARA CHESS — FILE 25
   FILE PATH: js/3d/material-factory.js

   PURPOSE:
   Premium 3D materials for chess pieces,
   boards, metals, crystals and decorations.

   DEPENDENCY:
   Three.js import map configured in index.html.
========================================================= */

import * as THREE from "three";

export const MATERIAL_PALETTE = Object.freeze({
  royalPurple: 0x54218f,
  deepPurple: 0x21102f,
  gold: 0xd6ad55,
  lightGold: 0xffdf91,
  silver: 0xc8d0dc,
  platinum: 0xe5e4e2,
  black: 0x111116,
  ivory: 0xf5eddb,
  crystalBlue: 0x65caff,
  ruby: 0xb51f48,
  emerald: 0x16a477,
  marbleWhite: 0xe8e3dc,
  marbleBlack: 0x25232a,
  bronze: 0x9a6338
});

export class MaterialFactory {
  constructor() {
    this.materials = new Map();
    this.isDisposed = false;
  }

  createStandard(name, options = {}) {
    this.ensureActive();

    const material = new THREE.MeshStandardMaterial({
      name,
      color: options.color ?? 0xffffff,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 0.5,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      flatShading: options.flatShading ?? false,
      vertexColors: options.vertexColors ?? false
    });

    if (options.emissive !== undefined) {
      material.emissive.set(options.emissive);
    }

    if (options.emissiveIntensity !== undefined) {
      material.emissiveIntensity = options.emissiveIntensity;
    }

    if (options.envMapIntensity !== undefined) {
      material.envMapIntensity = options.envMapIntensity;
    }

    if (options.roughnessMap) {
      material.roughnessMap = options.roughnessMap;
    }

    if (options.normalMap) {
      material.normalMap = options.normalMap;
    }

    this.materials.set(name, material);

    return material;
  }

  createPhysical(name, options = {}) {
    this.ensureActive();

    const material = new THREE.MeshPhysicalMaterial({
      name,
      color: options.color ?? 0xffffff,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 0.2,
      clearcoat: options.clearcoat ?? 0,
      clearcoatRoughness: options.clearcoatRoughness ?? 0.1,
      transmission: options.transmission ?? 0,
      thickness: options.thickness ?? 0,
      ior: options.ior ?? 1.5,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      envMapIntensity: options.envMapIntensity ?? 1
    });

    if (options.emissive !== undefined) {
      material.emissive.set(options.emissive);
    }

    if (options.emissiveIntensity !== undefined) {
      material.emissiveIntensity = options.emissiveIntensity;
    }

    this.materials.set(name, material);

    return material;
  }

  createGold(name = "royal-gold") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.gold,
      metalness: 0.92,
      roughness: 0.23,
      envMapIntensity: 1.4
    });
  }

  createPolishedGold(name = "polished-gold") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.lightGold,
      metalness: 1,
      roughness: 0.12,
      envMapIntensity: 1.8
    });
  }

  createSilver(name = "royal-silver") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.silver,
      metalness: 0.96,
      roughness: 0.2,
      envMapIntensity: 1.5
    });
  }

  createPlatinum(name = "royal-platinum") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.platinum,
      metalness: 0.98,
      roughness: 0.16,
      envMapIntensity: 1.7
    });
  }

  createBlackMetal(name = "black-metal") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.black,
      metalness: 0.88,
      roughness: 0.2
    });
  }

  createPurpleEnamel(name = "purple-enamel") {
    return this.createPhysical(name, {
      color: MATERIAL_PALETTE.royalPurple,
      metalness: 0.35,
      roughness: 0.19,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });
  }

  createCrystal(name = "blue-crystal") {
    return this.createPhysical(name, {
      color: MATERIAL_PALETTE.crystalBlue,
      metalness: 0,
      roughness: 0.08,
      transmission: 0.85,
      thickness: 1.2,
      ior: 1.5,
      transparent: true,
      opacity: 1,
      clearcoat: 1
    });
  }

  createRuby(name = "ruby-crystal") {
    return this.createPhysical(name, {
      color: MATERIAL_PALETTE.ruby,
      roughness: 0.1,
      transmission: 0.65,
      thickness: 1,
      ior: 1.7,
      transparent: true,
      clearcoat: 1
    });
  }

  createEmerald(name = "emerald-crystal") {
    return this.createPhysical(name, {
      color: MATERIAL_PALETTE.emerald,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 1,
      ior: 1.6,
      transparent: true,
      clearcoat: 1
    });
  }

  createIvory(name = "royal-ivory") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.ivory,
      metalness: 0.08,
      roughness: 0.32
    });
  }

  createMarble(name = "white-marble", color = MATERIAL_PALETTE.marbleWhite) {
    return this.createStandard(name, {
      color,
      metalness: 0.12,
      roughness: 0.28
    });
  }

  createWood(name = "dark-royal-wood", color = 0x49301f) {
    return this.createStandard(name, {
      color,
      metalness: 0.04,
      roughness: 0.42
    });
  }

  createBronze(name = "royal-bronze") {
    return this.createStandard(name, {
      color: MATERIAL_PALETTE.bronze,
      metalness: 0.85,
      roughness: 0.3
    });
  }

  createEmissive(name, color, intensity = 1) {
    return this.createStandard(name, {
      color,
      emissive: color,
      emissiveIntensity: intensity,
      metalness: 0.2,
      roughness: 0.25
    });
  }

  createChessPieceMaterials(options = {}) {
    const prefix = options.prefix ?? "chess-piece";
    const primary = options.primary ?? MATERIAL_PALETTE.ivory;
    const accent = options.accent ?? MATERIAL_PALETTE.gold;

    return {
      primary: this.createStandard(`${prefix}-primary`, {
        color: primary,
        metalness: options.metalness ?? 0.35,
        roughness: options.roughness ?? 0.24
      }),

      accent: this.createStandard(`${prefix}-accent`, {
        color: accent,
        metalness: 0.92,
        roughness: 0.18
      }),

      detail: this.createPhysical(`${prefix}-detail`, {
        color: options.detail ?? MATERIAL_PALETTE.royalPurple,
        metalness: 0.35,
        roughness: 0.2,
        clearcoat: 0.9
      })
    };
  }

  createBoardMaterials(options = {}) {
    const prefix = options.prefix ?? "chess-board";

    return {
      light: this.createMarble(
        `${prefix}-light`,
        options.lightColor ?? MATERIAL_PALETTE.marbleWhite
      ),

      dark: this.createMarble(
        `${prefix}-dark`,
        options.darkColor ?? MATERIAL_PALETTE.marbleBlack
      ),

      border: this.createGold(`${prefix}-border`),

      base: this.createWood(
        `${prefix}-base`,
        options.baseColor ?? 0x30202b
      )
    };
  }

  get(name) {
    return this.materials.get(name) ?? null;
  }

  has(name) {
    return this.materials.has(name);
  }

  remove(name, dispose = true) {
    const material = this.materials.get(name);

    if (!material) return false;

    if (dispose) {
      material.dispose();
    }

    this.materials.delete(name);

    return true;
  }

  getNames() {
    return Array.from(this.materials.keys());
  }

  ensureActive() {
    if (this.isDisposed) {
      throw new Error("MaterialFactory has been disposed.");
    }
  }

  dispose() {
    if (this.isDisposed) return;

    for (const material of this.materials.values()) {
      material.dispose();
    }

    this.materials.clear();
    this.isDisposed = true;
  }
}

export function createMaterialFactory() {
  return new MaterialFactory();
}

/* =========================================================
   FILE 25 END — material-factory.js
========================================================= */
  
