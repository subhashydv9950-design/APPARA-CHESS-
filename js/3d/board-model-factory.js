
/* =========================================================
   APPARA CHESS — FILE 28
   FILE PATH: js/3d/board-model-factory.js

   PURPOSE:
   Procedural luxury 3D chess board models.
   8x8 squares, borders, ornaments and themes.

   DEPENDENCY:
   Three.js + MaterialFactory.
========================================================= */

import * as THREE from "three";
import { createMaterialFactory } from "./material-factory.js";

export const BOARD_THEMES = Object.freeze({
  royal_gold: {
    name: "Royal Gold",
    light: 0xf0dfbd,
    dark: 0x392044,
    border: 0xd6ad55,
    base: 0x21102f
  },

  imperial: {
    name: "Imperial",
    light: 0xe8e3dc,
    dark: 0x25232a,
    border: 0xe5e4e2,
    base: 0x17151e
  },

  sapphire: {
    name: "Sapphire",
    light: 0xc9e7f5,
    dark: 0x153c68,
    border: 0x65caff,
    base: 0x101d35
  },

  emerald: {
    name: "Emerald",
    light: 0xd4e9d7,
    dark: 0x145b45,
    border: 0xd6ad55,
    base: 0x102e27
  },

  ruby: {
    name: "Ruby",
    light: 0xf1d9d9,
    dark: 0x691e37,
    border: 0xe4a0a0,
    base: 0x30111e
  },

  obsidian: {
    name: "Obsidian",
    light: 0x66636d,
    dark: 0x17151c,
    border: 0x9e8cc5,
    base: 0x09090d
  }
});

export class BoardModelFactory {
  constructor(options = {}) {
    this.materialFactory =
      options.materialFactory ?? createMaterialFactory();

    this.boardSize = options.boardSize ?? 8;
    this.squareSize = options.squareSize ?? 1;
    this.boardRegistry = new Map();

    this.isDisposed = false;
  }

  createBoard(options = {}) {
    this.ensureActive();

    const id = options.id ??
      `apparachess-board-${THREE.MathUtils.generateUUID()}`;

    const themeName = options.theme ?? "royal_gold";
    const theme = BOARD_THEMES[themeName];

    if (!theme) {
      throw new Error(`Unknown board theme: ${themeName}`);
    }

    const size = options.squareSize ?? this.squareSize;
    const boardSize = options.boardSize ?? this.boardSize;
    const totalSize = size * boardSize;

    const board = new THREE.Group();

    board.name = id;
    board.userData.boardId = id;
    board.userData.theme = themeName;
    board.userData.boardSize = boardSize;

    const materials = this.createThemeMaterials(themeName, theme);

    this.createBoardBase(
      board,
      totalSize,
      materials
    );

    this.createSquares(
      board,
      boardSize,
      size,
      materials
    );

    this.createBorders(
      board,
      totalSize,
      materials
    );

    this.createCornerDecorations(
      board,
      totalSize,
      materials
    );

    this.createCoordinateLabels(
      board,
      totalSize,
      size,
      options.showCoordinates ?? false
    );

    board.position.y = options.positionY ?? 0;

    this.boardRegistry.set(id, {
      board,
      themeName,
      materials
    });

    return board;
  }

  createThemeMaterials(themeName, theme) {
    return {
      light: this.materialFactory.createStandard(
        `${themeName}-light-square`,
        {
          color: theme.light,
          metalness: 0.12,
          roughness: 0.3
        }
      ),

      dark: this.materialFactory.createStandard(
        `${themeName}-dark-square`,
        {
          color: theme.dark,
          metalness: 0.18,
          roughness: 0.27
        }
      ),

      border: this.materialFactory.createStandard(
        `${themeName}-border`,
        {
          color: theme.border,
          metalness: 0.94,
          roughness: 0.19
        }
      ),

      base: this.materialFactory.createStandard(
        `${themeName}-base`,
        {
          color: theme.base,
          metalness: 0.3,
          roughness: 0.32
        }
      ),

      ornament: this.materialFactory.createStandard(
        `${themeName}-ornament`,
        {
          color: theme.border,
          metalness: 0.95,
          roughness: 0.15
        }
      )
    };
  }

  createBoardBase(group, totalSize, materials) {
    const baseThickness = 0.28;
    const borderWidth = 0.42;

    const geometry = new THREE.BoxGeometry(
      totalSize + borderWidth * 2,
      baseThickness,
      totalSize + borderWidth * 2
    );

    const base = new THREE.Mesh(
      geometry,
      materials.base
    );

    base.name = "board-solid-base";
    base.position.y = -baseThickness / 2;

    base.castShadow = true;
    base.receiveShadow = true;

    group.add(base);

    const lowerTrim = new THREE.Mesh(
      new THREE.BoxGeometry(
        totalSize + borderWidth * 2 + 0.08,
        0.07,
        totalSize + borderWidth * 2 + 0.08
      ),
      materials.border
    );

    lowerTrim.name = "board-lower-gold-trim";
    lowerTrim.position.y = -baseThickness + 0.035;

    group.add(lowerTrim);
  }

  createSquares(group, boardSize, squareSize, materials) {
    const start = -(boardSize * squareSize) / 2;

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const isLight = (row + col) % 2 === 0;

        const square = new THREE.Mesh(
          new THREE.BoxGeometry(
            squareSize,
            0.09,
            squareSize
          ),
          isLight ? materials.light : materials.dark
        );

        square.name = `square-${row}-${col}`;

        square.position.set(
          start + col * squareSize + squareSize / 2,
          0.015,
          start + row * squareSize + squareSize / 2
        );

        square.userData.square = {
          row,
          col,
          file: String.fromCharCode(97 + col),
          rank: boardSize - row
        };

        square.receiveShadow = true;
        square.castShadow = true;

        group.add(square);
      }
    }
  }

  createBorders(group, totalSize, materials) {
    const width = 0.42;
    const height = 0.22;
    const offset = totalSize / 2 + width / 2;

    const borderConfigs = [
      {
        name: "north",
        position: [0, 0.07, -offset],
        dimensions: [totalSize + width * 2, height, width]
      },
      {
        name: "south",
        position: [0, 0.07, offset],
        dimensions: [totalSize + width * 2, height, width]
      },
      {
        name: "east",
        position: [offset, 0.07, 0],
        dimensions: [width, height, totalSize]
      },
      {
        name: "west",
        position: [-offset, 0.07, 0],
        dimensions: [width, height, totalSize]
      }
    ];

    for (const config of borderConfigs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...config.dimensions),
        materials.border
      );

      mesh.name = `board-border-${config.name}`;
      mesh.position.set(...config.position);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      group.add(mesh);
    }
  }

  createCornerDecorations(group, totalSize, materials) {
    const offset = totalSize / 2 + 0.21;

    const positions = [
      [-offset, 0.20, -offset],
      [offset, 0.20, -offset],
      [-offset, 0.20, offset],
      [offset, 0.20, offset]
    ];

    positions.forEach((position, index) => {
      const ornament = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.17, 1),
        materials.ornament
      );

      ornament.name = `board-corner-jewel-${index}`;
      ornament.position.set(...position);

      ornament.castShadow = true;

      group.add(ornament);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.025, 10, 32),
        materials.ornament
      );

      ring.name = `board-corner-ring-${index}`;
      ring.position.set(
        position[0],
        0.12,
        position[2]
      );

      ring.rotation.x = Math.PI / 2;

      group.add(ring);
    });
  }

  createCoordinateLabels(
    group,
    totalSize,
    squareSize,
    enabled
  ) {
    if (!enabled) return;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, 256, 256);
    context.fillStyle = "#f5eddb";
    context.font = "bold 120px Georgia";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("A", 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const labels = new THREE.Group();
    labels.name = "board-coordinate-labels";

    const half = totalSize / 2;

    for (let i = 0; i < 8; i++) {
      const file = String.fromCharCode(97 + i);
      const rank = String(8 - i);

      this.addLabel(
        labels,
        file,
        -half + i * squareSize + squareSize / 2,
        -half - 0.27,
        material
      );

      this.addLabel(
        labels,
        rank,
        -half - 0.27,
        -half + i * squareSize + squareSize / 2,
        material
      );
    }

    group.add(labels);
  }

  addLabel(group, character, x, z, material) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, 128, 128);
    context.fillStyle = "#ffffff";
    context.font = "bold 86px Georgia";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(character, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const labelMaterial = material.clone();
    labelMaterial.map = texture;

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      labelMaterial
    );

    label.name = `board-label-${character}`;
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, 0.09, z);

    group.add(label);
  }

  createPreview(themeName = "royal_gold") {
    return this.createBoard({
      id: `preview-${themeName}-${THREE.MathUtils.generateUUID()}`,
      theme: themeName,
      showCoordinates: true
    });
  }

  getBoard(id) {
    return this.boardRegistry.get(id)?.board ?? null;
  }

  getAvailableThemes() {
    return Object.entries(BOARD_THEMES).map(
      ([id, theme]) => ({
        id,
        name: theme.name,
        colors: {
          light: theme.light,
          dark: theme.dark,
          border: theme.border,
          base: theme.base
        }
      })
    );
  }

  removeBoard(id, dispose = true) {
    const entry = this.boardRegistry.get(id);

    if (!entry) return false;

    entry.board.removeFromParent();

    if (dispose) {
      entry.board.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
      });
    }

    this.boardRegistry.delete(id);

    return true;
  }

  ensureActive() {
    if (this.isDisposed) {
      throw new Error("BoardModelFactory has been disposed.");
    }
  }

  dispose() {
    if (this.isDisposed) return;

    for (const id of this.boardRegistry.keys()) {
      this.removeBoard(id, true);
    }

    this.boardRegistry.clear();
    this.materialFactory = null;
    this.isDisposed = true;
  }
}

export function createBoardModelFactory(options = {}) {
  return new BoardModelFactory(options);
}

/* =========================================================
   FILE 28 END — board-model-factory.js
========================================================= */
        
