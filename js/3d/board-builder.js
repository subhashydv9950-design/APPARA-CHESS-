
import * as THREE from "three";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export class ChessBoardBuilder {
  constructor(options = {}) {
    this.options = {
      squareSize: 1,
      boardY: 0.62,
      showCoordinates: true,
      ...options
    };

    this.group = new THREE.Group();
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
      color: 0xe3cfaa,
      roughness: 0.34,
      metalness: 0.04
    });

    this.materials.dark = new THREE.MeshStandardMaterial({
      color: 0x493025,
      roughness: 0.3,
      metalness: 0.1
    });

    this.materials.gold = new THREE.MeshStandardMaterial({
      color: 0xc9a45c,
      roughness: 0.22,
      metalness: 0.82
    });

    this.materials.backing = new THREE.MeshStandardMaterial({
      color: 0x21140f,
      roughness: 0.36,
      metalness: 0.12
    });

    this.materials.selection = new THREE.MeshStandardMaterial({
      color: 0xe3cfaa,
      roughness: 0.3,
      emissive: 0x28a9e8,
      emissiveIntensity: 0
    });

    this.materials.legal = new THREE.MeshStandardMaterial({
      color: 0xe3cfaa,
      roughness: 0.3,
      emissive: 0x20c879,
      emissiveIntensity: 0
    });

    this.materials.lastMove = new THREE.MeshStandardMaterial({
      color: 0xe3cfaa,
      roughness: 0.3,
      emissive: 0xc59a32,
      emissiveIntensity: 0
    });
  }

  createBase() {
    const goldBase = new THREE.Mesh(
      new THREE.BoxGeometry(8.62, 0.28, 8.62),
      this.materials.gold
    );

    goldBase.position.y = 0.29;
    goldBase.castShadow = true;
    goldBase.receiveShadow = true;
    goldBase.userData.isBoardDecoration = true;

    this.group.add(goldBase);

    const woodBacking = new THREE.Mesh(
      new THREE.BoxGeometry(8.38, 0.16, 8.38),
      this.materials.backing
    );

    woodBacking.position.y = 0.49;
    woodBacking.castShadow = true;
    woodBacking.receiveShadow = true;

    this.group.add(woodBacking);

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

        const material = (
          isLight
            ? this.materials.light
            : this.materials.dark
        ).clone();

        const tile = new THREE.Mesh(geometry, material);

        tile.position.set(
          col - 3.5,
          this.options.boardY,
          row - 3.5
        );

        tile.receiveShadow = true;
        tile.castShadow = true;

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

    tile.material.emissive.copy(source.emissive);
    tile.material.emissiveIntensity = (
      type === "legal" ? 0.48 : 0.65
    );

    tile.userData.highlightType = type;

    return true;
  }

  clearHighlights() {
    for (const tile of this.tiles.values()) {
      tile.material.emissive.setHex(0x000000);
      tile.material.emissiveIntensity = 0;
      tile.userData.highlightType = null;
    }
  }

  setHighlights(selection, legalSquares = [], lastMove = []) {
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
    if (!this.tiles.has(square)) return null;

    const tile = this.tiles.get(square);
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

    this.group.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of materials) {
          if (material.map) material.map.dispose();
          material.dispose();
        }
      }
    });

    this.tiles.clear();
    this.group.clear();

    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
  }
}

export function createChessBoard(options = {}) {
  return new ChessBoardBuilder(options);
}

/* APPARA CHESS — 3D BOARD BUILDER COMPLETE */
