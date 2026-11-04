
/* =========================================================
   APPARA CHESS — FILE 26
   FILE PATH: js/3d/piece-model-factory.js

   PURPOSE:
   Procedural 3D chess piece models.
   Six individual piece designs:
   King, Queen, Rook, Bishop, Knight, Pawn.

   DEPENDENCY:
   Three.js + MaterialFactory.
========================================================= */

import * as THREE from "three";
import { createMaterialFactory } from "./material-factory.js";

let pieceSequence = 0;

export class PieceModelFactory {
  constructor(options = {}) {
    this.materialFactory =
      options.materialFactory ?? createMaterialFactory();

    this.defaultHeight = options.height ?? 2.4;
    this.pieceRegistry = new Map();
    this.isDisposed = false;
  }

  createPiece(type, options = {}) {
    this.ensureActive();

    const normalizedType = String(type).toLowerCase();

    const supportedTypes = [
      "king",
      "queen",
      "rook",
      "bishop",
      "knight",
      "pawn"
    ];

    if (!supportedTypes.includes(normalizedType)) {
      throw new Error(`Unsupported chess piece: ${type}`);
    }

    const id = options.id ??
      `piece-${normalizedType}-${++pieceSequence}`;

    const colors = this.getColors(options.color ?? "white");

    const materials = options.materials ??
      this.materialFactory.createChessPieceMaterials({
        prefix: id,
        primary: colors.primary,
        accent: colors.accent,
        detail: colors.detail,
        metalness: options.metalness ?? 0.35,
        roughness: options.roughness ?? 0.24
      });

    const group = new THREE.Group();

    group.name = id;
    group.userData.pieceType = normalizedType;
    group.userData.pieceId = id;
    group.userData.color = options.color ?? "white";

    const scale = options.scale ?? 1;

    switch (normalizedType) {
      case "king":
        this.buildKing(group, materials);
        break;

      case "queen":
        this.buildQueen(group, materials);
        break;

      case "rook":
        this.buildRook(group, materials);
        break;

      case "bishop":
        this.buildBishop(group, materials);
        break;

      case "knight":
        this.buildKnight(group, materials);
        break;

      case "pawn":
        this.buildPawn(group, materials);
        break;
    }

    group.scale.setScalar(scale);

    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.pieceRegistry.set(id, {
      group,
      type: normalizedType,
      materials
    });

    return group;
  }

  getColors(color) {
    if (color === "black") {
      return {
        primary: 0x211b2c,
        accent: 0xd6ad55,
        detail: 0x54218f
      };
    }

    return {
      primary: 0xf5eddb,
      accent: 0xd6ad55,
      detail: 0x54218f
    };
  }

  addMesh(group, geometry, material, name, position = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = name;
    mesh.position.set(...position);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);

    return mesh;
  }

  addCylinder(
    group,
    radiusTop,
    radiusBottom,
    height,
    material,
    name,
    position = [0, 0, 0],
    segments = 48
  ) {
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      segments
    );

    return this.addMesh(
      group,
      geometry,
      material,
      name,
      position
    );
  }

  addSphere(
    group,
    radius,
    material,
    name,
    position = [0, 0, 0],
    detail = 2
  ) {
    const geometry = new THREE.IcosahedronGeometry(
      radius,
      detail
    );

    return this.addMesh(
      group,
      geometry,
      material,
      name,
      position
    );
  }

  addTorus(
    group,
    radius,
    tube,
    material,
    name,
    position = [0, 0, 0]
  ) {
    const geometry = new THREE.TorusGeometry(
      radius,
      tube,
      12,
      64
    );

    return this.addMesh(
      group,
      geometry,
      material,
      name,
      position
    );
  }

  addLathe(
    group,
    points,
    material,
    name,
    segments = 64
  ) {
    const geometry = new THREE.LatheGeometry(
      points.map(([radius, height]) =>
        new THREE.Vector2(radius, height)
      ),
      segments
    );

    return this.addMesh(
      group,
      geometry,
      material,
      name
    );
  }

  createBase(group, materials, options = {}) {
    const height = options.height ?? 0.22;
    const radius = options.radius ?? 0.66;

    this.addCylinder(
      group,
      radius * 0.92,
      radius,
      height,
      materials.primary,
      "piece-base",
      [0, height / 2, 0]
    );

    this.addTorus(
      group,
      radius * 0.84,
      0.035,
      materials.accent,
      "base-gold-ring",
      [0, height * 0.72, 0]
    );

    this.addCylinder(
      group,
      radius * 0.77,
      radius * 0.84,
      0.08,
      materials.detail,
      "base-decoration",
      [0, height + 0.04, 0]
    );
  }

  createDecorativeRing(
    group,
    radius,
    height,
    materials,
    name = "decorative-ring"
  ) {
    this.addTorus(
      group,
      radius,
      0.035,
      materials.accent,
      name,
      [0, height, 0]
    );
  }

  buildPawn(group, materials) {
    this.createBase(group, materials, {
      radius: 0.57,
      height: 0.2
    });

    this.addLathe(
      group,
      [
        [0.34, 0.20],
        [0.39, 0.32],
        [0.32, 0.48],
        [0.24, 0.68],
        [0.19, 0.90],
        [0.25, 1.02],
        [0.29, 1.12]
      ],
      materials.primary,
      "pawn-body"
    );

    this.createDecorativeRing(
      group,
      0.29,
      0.48,
      materials,
      "pawn-waist-ring"
    );

    this.addSphere(
      group,
      0.31,
      materials.primary,
      "pawn-head",
      [0, 1.40, 0],
      3
    );

    this.addSphere(
      group,
      0.095,
      materials.accent,
      "pawn-crown-jewel",
      [0, 1.69, 0],
      2
    );
  }

  buildRook(group, materials) {
    this.createBase(group, materials, {
      radius: 0.62,
      height: 0.22
    });

    this.addLathe(
      group,
      [
        [0.38, 0.22],
        [0.42, 0.35],
        [0.31, 0.52],
        [0.30, 0.85],
        [0.38, 1.05],
        [0.42, 1.16],
        [0.44, 1.30],
        [0.44, 1.42]
      ],
      materials.primary,
      "rook-tower"
    );

    this.createDecorativeRing(
      group,
      0.40,
      1.14,
      materials,
      "rook-gold-collar"
    );

    this.addCylinder(
      group,
      0.53,
      0.46,
      0.16,
      materials.detail,
      "rook-top-platform",
      [0, 1.47, 0]
    );

    const crenelCount = 8;
    const radius = 0.43;

    for (let i = 0; i < crenelCount; i++) {
      const angle = (i / crenelCount) * Math.PI * 2;

      const block = this.addMesh(
        group,
        new THREE.BoxGeometry(0.23, 0.27, 0.19),
        materials.primary,
        `rook-crenel-${i}`,
        [
          Math.cos(angle) * radius,
          1.67,
          Math.sin(angle) * radius
        ]
      );

      block.rotation.y = -angle;
    }

    this.addSphere(
      group,
      0.12,
      materials.accent,
      "rook-center-jewel",
      [0, 1.60, 0],
      2
    );
  }

  buildBishop(group, materials) {
    this.createBase(group, materials, {
      radius: 0.58,
      height: 0.21
    });

    this.addLathe(
      group,
      [
        [0.35, 0.21],
        [0.39, 0.35],
        [0.28, 0.52],
        [0.22, 0.75],
        [0.24, 0.96],
        [0.34, 1.12],
        [0.30, 1.25]
      ],
      materials.primary,
      "bishop-body"
    );

    this.createDecorativeRing(
      group,
      0.29,
      1.08,
      materials,
      "bishop-collar"
    );

    this.addSphere(
      group,
      0.36,
      materials.primary,
      "bishop-head",
      [0, 1.48, 0],
      3
    );

    this.addSphere(
      group,
      0.15,
      materials.accent,
      "bishop-top-gem",
      [0, 1.84, 0],
      2
    );

    const slit = this.addMesh(
      group,
      new THREE.BoxGeometry(0.075, 0.48, 0.075),
      materials.detail,
      "bishop-diagonal-detail",
      [0.02, 1.49, 0.30]
    );

    slit.rotation.z = -0.55;
    slit.rotation.x = 0.25;
  }

  buildQueen(group, materials) {
    this.createBase(group, materials, {
      radius: 0.62,
      height: 0.22
    });

    this.addLathe(
      group,
      [
        [0.36, 0.22],
        [0.42, 0.38],
        [0.32, 0.56],
        [0.23, 0.78],
        [0.25, 1.00],
        [0.34, 1.18],
        [0.30, 1.34]
      ],
      materials.primary,
      "queen-body"
    );

    this.createDecorativeRing(
      group,
      0.35,
      1.14,
      materials,
      "queen-gold-collar"
    );

    this.addCylinder(
      group,
      0.39,
      0.25,
      0.12,
      materials.detail,
      "queen-crown-base",
      [0, 1.37, 0]
    );

    this.addTorus(
      group,
      0.34,
      0.055,
      materials.accent,
      "queen-crown-ring",
      [0, 1.47, 0]
    );

    const crownCount = 8;
    const crownRadius = 0.33;

    for (let i = 0; i < crownCount; i++) {
      const angle = (i / crownCount) * Math.PI * 2;

      const x = Math.cos(angle) * crownRadius;
      const z = Math.sin(angle) * crownRadius;

      this.addSphere(
        group,
        0.095,
        materials.accent,
        `queen-crown-point-${i}`,
        [x, 1.62, z],
        2
      );
    }

    this.addSphere(
      group,
      0.16,
      materials.detail,
      "queen-center-gem",
      [0, 1.63, 0],
      3
    );

    this.addSphere(
      group,
      0.105,
      materials.accent,
      "queen-top-jewel",
      [0, 1.88, 0],
      2
    );
  }

  buildKing(group, materials) {
    this.createBase(group, materials, {
      radius: 0.65,
      height: 0.23
    });

    this.addLathe(
      group,
      [
        [0.38, 0.23],
        [0.43, 0.40],
        [0.32, 0.58],
        [0.26, 0.83],
        [0.29, 1.06],
        [0.39, 1.25],
        [0.35, 1.42]
      ],
      materials.primary,
      "king-body"
    );

    this.createDecorativeRing(
      group,
      0.37,
      1.20,
      materials,
      "king-royal-collar"
    );

    this.addCylinder(
      group,
      0.42,
      0.32,
      0.13,
      materials.detail,
      "king-crown-base",
      [0, 1.48, 0]
    );

    this.addSphere(
      group,
      0.27,
      materials.primary,
      "king-crown-center",
      [0, 1.72, 0],
      3
    );

    this.createDecorativeRing(
      group,
      0.25,
      1.72,
      materials,
      "king-crown-gold-ring"
    );

    // Royal cross: vertical and horizontal arms.
    this.addCylinder(
      group,
      0.065,
      0.065,
      0.68,
      materials.accent,
      "king-cross-vertical",
      [0, 2.17, 0],
      24
    );

    this.addCylinder(
      group,
      0.065,
      0.065,
      0.40,
      materials.accent,
      "king-cross-horizontal",
      [0, 2.30, 0],
      24
    ).rotation.z = Math.PI / 2;

    this.addSphere(
      group,
      0.11,
      materials.detail,
      "king-cross-jewel",
      [0, 2.53, 0],
      2
    );
  }

  buildKnight(group, materials) {
    this.createBase(group, materials, {
      radius: 0.62,
      height: 0.22
    });

    this.addLathe(
      group,
      [
        [0.36, 0.22],
        [0.42, 0.36],
        [0.30, 0.54],
        [0.24, 0.72],
        [0.30, 0.89],
        [0.38, 1.02]
      ],
      materials.primary,
      "knight-body"
    );

    this.createDecorativeRing(
      group,
      0.35,
      0.94,
      materials,
      "knight-collar"
    );

    // Horse head silhouette made from custom extruded geometry.
    const shape = new THREE.Shape();

    shape.moveTo(-0.35, 0);
    shape.lineTo(-0.38, 0.32);
    shape.lineTo(-0.20, 0.62);
    shape.lineTo(-0.22, 0.94);
    shape.lineTo(-0.05, 1.22);
    shape.lineTo(0.12, 1.06);
    shape.lineTo(0.18, 0.87);
    shape.lineTo(0.38, 0.75);
    shape.lineTo(0.43, 0.60);
    shape.lineTo(0.22, 0.48);
    shape.lineTo(0.15, 0.20);
    shape.lineTo(0.30, 0);
    shape.closePath();

    const headGeometry = new THREE.ExtrudeGeometry(
      shape,
      {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.04
      }
    );

    const head = this.addMesh(
      group,
      headGeometry,
      materials.primary,
      "knight-horse-head",
      [0, 0.88, -0.11]
    );

    head.rotation.y = 0;

    this.addSphere(
      group,
      0.075,
      materials.accent,
      "knight-eye",
      [0.20, 1.78, 0.15],
      2
    );

    this.addMesh(
      group,
      new THREE.ConeGeometry(0.10, 0.38, 5),
      materials.detail,
      "knight-ear",
      [-0.17, 2.08, 0]
    );

    this.addSphere(
      group,
      0.09,
      materials.accent,
      "knight-muzzle-detail",
      [0.34, 1.52, 0.02],
      2
    );
  }

  createSet(options = {}) {
    this.ensureActive();

    const color = options.color ?? "white";
    const pieces = {};

    const types = [
      "king",
      "queen",
      "rook",
      "bishop",
      "knight",
      "pawn"
    ];

    for (const type of types) {
      pieces[type] = this.createPiece(type, {
        color,
        scale: options.scale ?? 1
      });
    }

    return pieces;
  }

  createFullArmy(color = "white", options = {}) {
    const army = [];

    army.push(
      this.createPiece("king", { color, ...options })
    );

    army.push(
      this.createPiece("queen", { color, ...options })
    );

    for (let i = 0; i < 2; i++) {
      army.push(
        this.createPiece("rook", { color, ...options })
      );

      army.push(
        this.createPiece("bishop", { color, ...options })
      );

      army.push(
        this.createPiece("knight", { color, ...options })
      );
    }

    for (let i = 0; i < 8; i++) {
      army.push(
        this.createPiece("pawn", { color, ...options })
      );
    }

    return army;
  }

  getPiece(id) {
    return this.pieceRegistry.get(id)?.group ?? null;
  }

  removePiece(id, dispose = true) {
    const entry = this.pieceRegistry.get(id);

    if (!entry) return false;

    if (dispose) {
      entry.group.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
      });
    }

    entry.group.removeFromParent();
    this.pieceRegistry.delete(id);

    return true;
  }

  getRegistrySize() {
    return this.pieceRegistry.size;
  }

  ensureActive() {
    if (this.isDisposed) {
      throw new Error("PieceModelFactory has been disposed.");
    }
  }

  dispose() {
    if (this.isDisposed) return;

    for (const entry of this.pieceRegistry.values()) {
      entry.group.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
      });
    }

    this.pieceRegistry.clear();
    this.materialFactory = null;
    this.isDisposed = true;
  }
}

export function createPieceModelFactory(options = {}) {
  return new PieceModelFactory(options);
}

/* =========================================================
   FILE 26 END — piece-model-factory.js
========================================================= */
      
