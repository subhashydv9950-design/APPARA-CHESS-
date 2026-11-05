/* =========================================================
   APPARA CHESS
   FILE: js/3d/board-builder.js
   PREMIUM ROYAL 3D CHESS BOARD
   FULL FILE REPLACEMENT
   ========================================================= */

import * as THREE from "three";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export class ChessBoardBuilder {
  constructor(options = {}) {
    this.options = {
      squareSize: 1,
      boardY: 0.62,
      showCoordinates: true,
      lightColor: 0xe8d9b8,
      darkColor: 0x392541,
      borderColor: 0xc9a45c,
      ...options
    };

    this.group = new THREE.Group();
    this.group.name = "apparachess-3d-board";

    this.tiles = new Map();
    this.materials = {};
    this.disposed = false;

    this.createMaterials();
    this.createBase();
    this.createSquares();

    if (this.options.showCoordinates) {
      this.createCoordinates();
    }
  }

  createMaterials() {
    this.materials.light = new THREE.MeshStandardMaterial({
      color: this.options.lightColor,
      roughness: 0.3,
      metalness: 0.08
    });

    this.materials.dark = new THREE.MeshStandardMaterial({
      color: this.options.darkColor,
      roughness: 0.3,
      metalness: 0.12
    });

    this.materials.gold = new THREE.MeshStandardMaterial({
      color: this.options.borderColor,
      roughness: 0.22,
      metalness: 0.82
    });

    this.materials.backing = new THREE.MeshStandardMaterial({
      color: 0x21140f,
      roughness: 0.36,
      metalness: 0.12
    });

    this.materials.selection = new THREE.MeshStandardMaterial({
      color: this.options.lightColor,
      roughness: 0.3,
      emissive: 0x28a9e8,
      emissiveIntensity: 0
    });

    this.materials.legal = new THREE.MeshStandardMaterial({
      color: this.options.lightColor,
      roughness: 0.3,
      emissive: 0x20c879,
      emissiveIntensity: 0
    });

    this.materials.lastMove = new THREE.MeshStandardMaterial({
      color: this.options.lightColor,
      roughness: 0.3,
      emissive: 0xc59a32,
      emissiveIntensity: 0
    });
  }

  createBase() {
    // Royal gold bottom border
    const goldBase = new THREE.Mesh(
      new THREE.BoxGeometry(8.62, 0.28, 8.62),
      this.materials.gold
    );

    goldBase.position.y = 0.29;
    goldBase.castShadow = true;
    goldBase.receiveShadow = true;
    goldBase.userData.isBoardDecoration = true;

    this.group.add(goldBase);

    // Dark wooden board backing
    const woodBacking = new THREE.Mesh(
      new THREE.BoxGeometry(8.38, 0.16, 8.38),
      this.materials.backing
    );

    woodBacking.position.y = 0.49;
    woodBacking.castShadow = true;
    woodBacking.receiveShadow = true;

    this.group.add(woodBacking);

    // Fine golden inner trim
    const innerTrim = new THREE.Mesh(
      new THREE.BoxGeometry(8.16, 0.045, 8.16),
      this.materials.gold
    );

    innerTrim.position.y = 0.585;

    this.group.add(innerTrim);
  }

  createSquares() {
    const geometry = new THREE.BoxGeometry(
      this.options.squareSize,
      0.09,
      this.options.squareSize
    );

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = `${FILES[col]}${8 - row}`;
        const isLight = (row + col) % 2 === 0;

        const sourceMaterial = isLight
          ? this.materials.light
          : this.materials.dark;

        const material = sourceMaterial.clone();

        const tile = new THREE.Mesh(
          geometry,
          material
        );

        tile.name = `square-${square}`;

        tile.position.set(
          col - 3.5,
          this.options.boardY,
          row - 3.5
        );

        tile.castShadow = true;
        tile.receiveShadow = true;

        tile.userData.square = square;
        tile.userData.baseColor = material.color.getHex();
        tile.userData.highlightType = null;

        this.tiles.set(square, tile);
        this.group.add(tile);
      }
    }
  }

  createCoordinates() {
    const labels = [];

    for (let i = 0; i < 8; i++) {
      labels.push({
        text: FILES[i].toUpperCase(),
        x: i - 3.5,
        z: 4.16
      });

      labels.push({
        text: FILES[i].toUpperCase(),
        x: i - 3.5,
        z: -4.16
      });

      labels.push({
        text: String(8 - i),
        x: -4.16,
        z: i - 3.5
      });

      labels.push({
        text: String(8 - i),
        x: 4.16,
        z: i - 3.5
      });
    }

    for (const label of labels) {
      const sprite = this.createTextSprite(label.text);

      sprite.position.set(
        label.x,
        0.65,
        label.z
      );

      sprite.userData.isCoordinate = true;

      this.group.add(sprite);
    }
  }

  createTextSprite(text) {
    const canvas = document.createElement("canvas");

    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, 128, 128);

    context.fillStyle = "#d7b66f";
    context.font = "bold 68px Georgia";
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillText(text, 64, 65);

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);

    sprite.scale.set(0.22, 0.22, 1);

    return sprite;
  }

  getTile(square) {
    return this.tiles.get(square) || null;
  }

  // Compatibility alias used by ThreeChessEngine.
  getSquareObject(square) {
    return this.getTile(square);
  }

  highlight(square, type = "selection") {
    const tile = this.getTile(square);

    if (!tile) return false;

    const materialMap = {
      selection: this.materials.selection,
      legal: this.materials.legal,
      lastMove: this.materials.lastMove
    };

    const source = materialMap[type];

    if (!source) return false;

    tile.material.emissive.copy(
      source.emissive
    );

    tile.material.emissiveIntensity =
      type === "legal" ? 0.48 : 0.65;

    tile.userData.highlightType = type;

    return true;
  }

  // Compatibility alias used by ThreeChessEngine.
  highlightSquare(square, type = "selection") {
    return this.highlight(square, type);
  }

  clearHighlights() {
    for (const tile of this.tiles.values()) {
      tile.material.emissive.setHex(0x000000);
      tile.material.emissiveIntensity = 0;
      tile.userData.highlightType = null;
    }
  }

  setHighlights(
    selection,
    legalSquares = [],
    lastMove = []
  ) {
    this.clearHighlights();

    if (lastMove.length === 2) {
      this.highlight(lastMove[0], "lastMove");
      this.highlight(lastMove[1], "lastMove");
    }

    if (selection) {
      this.highlight(selection, "selection");
    }

    for (const square of legalSquares) {
      this.highlight(square, "legal");
    }
  }

  getSquareFromObject(object) {
    let current = object;

    while (current) {
      if (current.userData?.square) {
        return current.userData.square;
      }

      current = current.parent;
    }

    return null;
  }

  getSquareWorldPosition(square) {
    const tile = this.getTile(square);

    if (!tile) return null;

    const position = new THREE.Vector3();

    tile.getWorldPosition(position);

    return position;
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();

    this.group.traverse(object => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }

      if (object.material) {
        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of list) {
          if (!material) continue;

          materials.add(material);

          if (material.map) {
            textures.add(material.map);
          }
        }
      }
    });

    for (const geometry of geometries) {
      geometry.dispose();
    }

    for (const texture of textures) {
      texture.dispose();
    }

    for (const material of materials) {
      material.dispose();
    }

    this.tiles.clear();
    this.group.clear();
    this.materials = {};
  }
}

export function createChessBoard(options = {}) {
  return new ChessBoardBuilder(options);
}

/* =========================================================
   FILE COMPLETE
   PATH: js/3d/board-builder.js
   ========================================================= */
