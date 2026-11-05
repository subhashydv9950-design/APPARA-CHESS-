
/* =========================================================
   APPARA CHESS
   FILE: js/3d/pieces/piece-factory.js

   PREMIUM PROCEDURAL 3D CHESS PIECE FACTORY
   Pieces: Pawn, Rook, Knight, Bishop, Queen, King
   ========================================================= */

import * as THREE from "three";

const PIECE_TYPES = ["p", "r", "n", "b", "q", "k"];

export class ChessPieceFactory {
  constructor(options = {}) {
    this.options = {
      detail: 32,
      ...options
    };
  }

  create(color, type) {
    if (!["w", "b"].includes(color)) {
      throw new Error("Piece color must be w or b.");
    }

    if (!PIECE_TYPES.includes(type)) {
      throw new Error(`Invalid chess piece type: ${type}`);
    }

    const group = new THREE.Group();
    group.name = `apparachess-${color}-${type}`;

    group.userData.color = color;
    group.userData.type = type;

    const materials = this.createMaterials(color);

    this.addBase(group, materials);

    switch (type) {
      case "p":
        this.createPawn(group, materials);
        break;
      case "r":
        this.createRook(group, materials);
        break;
      case "n":
        this.createKnight(group, materials);
        break;
      case "b":
        this.createBishop(group, materials);
        break;
      case "q":
        this.createQueen(group, materials);
        break;
      case "k":
        this.createKing(group, materials);
        break;
    }

    group.traverse(object => {
      if (!object.isMesh) return;

      object.castShadow = true;
      object.receiveShadow = true;
    });

    return group;
  }

  createMaterials(color) {
    const white = color === "w";

    return {
      main: new THREE.MeshStandardMaterial({
        color: white ? 0xf2ead8 : 0x211b2a,
        metalness: white ? 0.22 : 0.62,
        roughness: white ? 0.23 : 0.28
      }),

      gold: new THREE.MeshStandardMaterial({
        color: white ? 0xd5b66f : 0x987044,
        metalness: 0.86,
        roughness: 0.2
      }),

      dark: new THREE.MeshStandardMaterial({
        color: white ? 0xb6a78c : 0x100d16,
        metalness: 0.38,
        roughness: 0.32
      }),

      jewel: new THREE.MeshPhysicalMaterial({
        color: white ? 0x8c6be0 : 0x6b3cb5,
        metalness: 0.35,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08
      })
    };
  }

  mesh(geometry, material, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    return object;
  }

  cylinder(
    group,
    top,
    bottom,
    height,
    y,
    material,
    radial = 40
  ) {
    const object = this.mesh(
      new THREE.CylinderGeometry(
        top,
        bottom,
        height,
        radial
      ),
      material,
      [0, y, 0]
    );

    group.add(object);
    return object;
  }

  sphere(
    group,
    radius,
    position,
    material,
    scale = [1, 1, 1]
  ) {
    const object = this.mesh(
      new THREE.SphereGeometry(
        radius,
        this.options.detail,
        24
      ),
      material,
      position
    );

    object.scale.set(...scale);
    group.add(object);
    return object;
  }

  torus(group, radius, tube, y, material) {
    const object = this.mesh(
      new THREE.TorusGeometry(radius, tube, 12, 48),
      material,
      [0, y, 0]
    );

    object.rotation.x = Math.PI / 2;
    group.add(object);
    return object;
  }

  addBase(group, materials) {
    this.cylinder(
      group, 0.31, 0.38, 0.12, 0.07, materials.gold
    );

    this.cylinder(
      group, 0.27, 0.31, 0.1, 0.17, materials.main
    );

    this.cylinder(
      group, 0.19, 0.27, 0.12, 0.28, materials.gold
    );

    this.torus(group, 0.285, 0.025, 0.13, materials.gold);
    this.torus(group, 0.215, 0.018, 0.32, materials.gold);
  }

  createPawn(group, materials) {
    this.cylinder(
      group, 0.14, 0.19, 0.34, 0.5, materials.main
    );

    this.sphere(
      group, 0.19, [0, 0.79, 0],
      materials.main, [1, 1.05, 1]
    );

    this.torus(group, 0.15, 0.025, 0.64, materials.gold);
    this.sphere(
      group, 0.055, [0, 0.94, 0],
      materials.jewel
    );
  }

  createRook(group, materials) {
    this.cylinder(
      group, 0.2, 0.24, 0.65, 0.65, materials.main
    );

    this.cylinder(
      group, 0.29, 0.22, 0.13, 1.03, materials.gold
    );

    this.cylinder(
      group, 0.25, 0.25, 0.14, 1.15, materials.main
    );

    const battlementCount = 8;

    for (let i = 0; i < battlementCount; i++) {
      const angle = (i / battlementCount) * Math.PI * 2;

      const block = this.mesh(
        new THREE.BoxGeometry(0.12, 0.19, 0.12),
        materials.gold
      );

      block.position.set(
        Math.cos(angle) * 0.18,
        1.29,
        Math.sin(angle) * 0.18
      );

      group.add(block);
    }

    this.torus(group, 0.22, 0.025, 0.92, materials.gold);
  }

  createKnight(group, materials) {
    this.cylinder(
      group, 0.18, 0.23, 0.48, 0.59, materials.main
    );

    // Sculpted neck
    const neck = this.mesh(
      new THREE.CapsuleGeometry(0.14, 0.48, 8, 16),
      materials.main,
      [0, 0.94, 0.015]
    );

    neck.rotation.z = -0.35;
    group.add(neck);

    // Horse head
    this.sphere(
      group,
      0.19,
      [0, 1.25, 0.06],
      materials.main,
      [0.88, 1.12, 1.28]
    );

    // Muzzle
    this.sphere(
      group,
      0.12,
      [0, 1.13, 0.27],
      materials.main,
      [0.85, 0.72, 1.3]
    );

    // Ears
    for (const x of [-0.105, 0.105]) {
      const ear = this.mesh(
        new THREE.ConeGeometry(0.065, 0.23, 16),
        materials.gold,
        [x, 1.49, 0.015]
      );

      ear.rotation.z = x < 0 ? 0.15 : -0.15;
      group.add(ear);
    }

    // Eyes
    for (const x of [-0.125, 0.125]) {
      this.sphere(
        group,
        0.035,
        [x, 1.29, 0.215],
        materials.jewel
      );
    }

    // Mane details
    for (let i = 0; i < 4; i++) {
      const mane = this.mesh(
        new THREE.ConeGeometry(0.065, 0.2, 12),
        materials.gold,
        [0, 1.43 - i * 0.105, -0.08]
      );

      mane.rotation.z = -0.3;
      group.add(mane);
    }

    this.torus(group, 0.19, 0.022, 0.85, materials.gold);
  }

  createBishop(group, materials) {
    this.cylinder(
      group, 0.17, 0.22, 0.48, 0.61, materials.main
    );

    this.sphere(
      group,
      0.2,
      [0, 1.02, 0],
      materials.main,
      [0.82, 1.35, 0.82]
    );

    this.cylinder(
      group, 0.23, 0.15, 0.1, 1.23, materials.gold
    );

    this.sphere(
      group,
      0.105,
      [0, 1.36, 0],
      materials.jewel
    );

    const tip = this.mesh(
      new THREE.ConeGeometry(0.09, 0.25, 24),
      materials.gold,
      [0, 1.54, 0]
    );

    group.add(tip);

    // Mitre diagonal band
    const band = this.mesh(
      new THREE.TorusGeometry(0.17, 0.025, 12, 40),
      materials.gold,
      [0, 1.02, 0]
    );

    band.rotation.x = Math.PI / 2;
    band.rotation.z = Math.PI / 4;
    group.add(band);
  }

  createQueen(group, materials) {
    this.cylinder(
      group, 0.17, 0.23, 0.58, 0.66, materials.main
    );

    this.sphere(
      group,
      0.21,
      [0, 1.05, 0],
      materials.main,
      [1, 0.8, 1]
    );

    this.cylinder(
      group, 0.24, 0.16, 0.12, 1.22, materials.gold
    );

    this.cylinder(
      group, 0.2, 0.2, 0.1, 1.32, materials.main
    );

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;

      const point = this.mesh(
        new THREE.ConeGeometry(0.065, 0.23, 16),
        materials.gold,
        [
          Math.cos(angle) * 0.19,
          1.47,
          Math.sin(angle) * 0.19
        ]
      );

      group.add(point);

      this.sphere(
        group,
        0.045,
        [
          Math.cos(angle) * 0.19,
          1.59,
          Math.sin(angle) * 0.19
        ],
        materials.jewel
      );
    }

    this.sphere(
      group, 0.105, [0, 1.49, 0], materials.jewel
    );

    this.torus(group, 0.22, 0.025, 1.25, materials.gold);
  }

  createKing(group, materials) {
    this.cylinder(
      group, 0.18, 0.24, 0.65, 0.68, materials.main
    );

    this.sphere(
      group,
      0.2,
      [0, 1.1, 0],
      materials.main
    );

    this.cylinder(
      group, 0.24, 0.16, 0.12, 1.28, materials.gold
    );

    // Royal crown
    this.cylinder(
      group, 0.17, 0.22, 0.12, 1.39, materials.main
    );

    // Vertical cross
    const vertical = this.mesh(
      new THREE.BoxGeometry(0.075, 0.4, 0.075),
      materials.gold,
      [0, 1.69, 0]
    );

    group.add(vertical);

    const horizontal = this.mesh(
      new THREE.BoxGeometry(0.3, 0.075, 0.075),
      materials.gold,
      [0, 1.75, 0]
    );

    group.add(horizontal);

    this.sphere(
      group, 0.055, [0, 1.91, 0], materials.jewel
    );

    this.torus(group, 0.22, 0.025, 1.32, materials.gold);
  }

  dispose(group) {
    if (!group) return;

    group.traverse(object => {
      if (!object.isMesh) return;

      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
  }
}

export function createChessPiece(color, type, options = {}) {
  const factory = new ChessPieceFactory(options);
  return factory.create(color, type);
}

/* =========================================================
   FILE COMPLETE
   js/3d/pieces/piece-factory.js
   ========================================================= */
