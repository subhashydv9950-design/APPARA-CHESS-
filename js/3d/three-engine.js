/* =========================================================
   APPARA CHESS
   FILE: js/3d/three-engine.js
   PREMIUM 3D CHESS ENGINE
   PART 1/4 — CORE, SCENE, LIGHTING, ROYAL ROOM
   ========================================================= */

import * as THREE from "three";

import { ChessBoardBuilder } from "./board-builder.js";
import { ChessPieceFactory } from "./pieces/piece-factory.js";
import { ChessCameraController } from "./camera-controller.js";
import { ChessAnimationController } from "./animation-controller.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const COLORS = {
  room: 0x100b1b,
  floor: 0x17111e,
  gold: 0xc9a45c,
  purple: 0x6f42a5,
  wood: 0x26170f
};

export class ThreeChessEngine {
  constructor(options = {}) {
    this.options = {
      antialias: true,
      shadows: true,
      pixelRatioLimit: 1.5,
      boardSize: 8,
      ...options
    };

    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.roomGroup = null;
    this.tableGroup = null;
    this.boardBuilder = null;
    this.pieceGroup = null;

    this.pieces = new Map();

    this.pieceFactory = new ChessPieceFactory();
    this.cameraController = null;
    this.animationController = new ChessAnimationController();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.selectedSquare = null;
    this.legalSquares = [];
    this.position = null;

    this.animationFrame = 0;
    this.resizeObserver = null;

    this.pointerStart = null;
    this.activePointerId = null;
    this.pointerMoved = false;

    this.disposed = false;

    this.onSquareClick = options.onSquareClick || (() => {});
    this.onPieceMove = options.onPieceMove || (() => {});
    this.onReady = options.onReady || (() => {});

    this.boundPointerDown = e => this.handlePointerDown(e);
    this.boundPointerUp = e => this.handlePointerUp(e);
    this.boundResize = () => this.resize();
  }

  initialize(container, options = {}) {
    if (this.disposed) {
      throw new Error("3D Chess Engine has been disposed.");
    }

    if (!container) {
      throw new Error("A valid 3D container is required.");
    }

    if (this.renderer) return this;

    this.container = container;
    Object.assign(this.options, options);

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLighting();
    this.createRoyalRoom();
    this.createChessTable();
    this.createChessBoard();
    this.createPieceGroup();
    this.createCameraControls();
    this.attachEvents();

    this.resize();
    this.animate();

    this.onReady(this);

    return this;
  }

  createScene() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(COLORS.room);

    this.scene.fog = new THREE.Fog(
      COLORS.room,
      24,
      75
    );
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      38,
      1,
      0.1,
      120
    );

    this.camera.position.set(10, 12, 15);
    this.camera.lookAt(0, 1, 0);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: false,
      powerPreference: "high-performance"
    });

    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        this.options.pixelRatioLimit
      )
    );

    this.renderer.shadowMap.enabled =
      Boolean(this.options.shadows);

    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    this.renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    this.renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure = 1.12;

    const canvas = this.renderer.domElement;

    canvas.className = "apparachess-3d-canvas";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";

    this.container.replaceChildren(canvas);
  }

  createLighting() {
    const ambient = new THREE.HemisphereLight(
      0xe9ddff,
      0x261626,
      2
    );

    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(
      0xffe4b2,
      3.2
    );

    keyLight.position.set(7, 13, 8);
    keyLight.castShadow = true;

    keyLight.shadow.mapSize.set(1024, 1024);

    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;

    this.scene.add(keyLight);

    const purpleLight = new THREE.PointLight(
      COLORS.purple,
      45,
      30
    );

    purpleLight.position.set(-8, 5, -5);
    this.scene.add(purpleLight);

    const goldLight = new THREE.PointLight(
      0xffc875,
      35,
      25
    );

    goldLight.position.set(8, 4, 5);
    this.scene.add(goldLight);
  }

  createRoyalRoom() {
    this.roomGroup = new THREE.Group();
    this.roomGroup.name = "apparachess-royal-room";

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.38,
      metalness: 0.12
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.42;
    floor.receiveShadow = true;

    this.roomGroup.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x21172c,
      roughness: 0.82
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(40, 18, 0.5),
      wallMaterial
    );

    backWall.position.set(0, 8.5, -18);
    this.roomGroup.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 18, 40),
      wallMaterial
    );

    leftWall.position.set(-20, 8.5, 0);
    this.roomGroup.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = 20;

    this.roomGroup.add(rightWall);

    this.createPillars();

    this.scene.add(this.roomGroup);
  }

  createPillars() {
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x33243f,
      metalness: 0.35,
      roughness: 0.45
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.82,
      roughness: 0.25
    });

    const positions = [
      [-10, -8],
      [10, -8],
      [-10, 8],
      [10, 8]
    ];

    for (const [x, z] of positions) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.48,
          0.65,
          8,
          24
        ),
        pillarMaterial
      );

      pillar.position.set(x, 3.6, z);
      pillar.castShadow = true;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.9,
          0.9,
          0.28,
          32
        ),
        goldMaterial
      );

      base.position.set(x, -0.28, z);

      const top = base.clone();
      top.position.y = 7.5;

      this.roomGroup.add(pillar, base, top);
    }
  }

/* =========================================================
   PART 1/4 END
   FILE CONTINUES — DO NOT SAVE YET
   ========================================================= */
     createChessTable() {
    this.tableGroup = new THREE.Group();
    this.tableGroup.name = "apparachess-royal-chess-table";

    const darkWood = new THREE.MeshStandardMaterial({
      color: 0x24150f,
      roughness: 0.3,
      metalness: 0.16
    });

    const gold = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      roughness: 0.23,
      metalness: 0.82
    });

    // Main table top
    const tabletop = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 0.48, 11.4),
      darkWood
    );

    tabletop.position.y = 0.82;
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;

    this.tableGroup.add(tabletop);

    // Golden table rim
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(11.55, 0.12, 11.55),
      gold
    );

    rim.position.y = 0.91;
    this.tableGroup.add(rim);

    // Tabletop overlay
    const upperTop = new THREE.Mesh(
      new THREE.BoxGeometry(11.25, 0.16, 11.25),
      darkWood
    );

    upperTop.position.y = 1.12;
    upperTop.castShadow = true;
    upperTop.receiveShadow = true;

    this.tableGroup.add(upperTop);

    // Four decorative legs
    const legPositions = [
      [-4.75, -4.75],
      [4.75, -4.75],
      [-4.75, 4.75],
      [4.75, 4.75]
    ];

    for (const [x, z] of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 2.1, 0.65),
        darkWood
      );

      leg.position.set(x, -0.25, z);
      leg.castShadow = true;
      leg.receiveShadow = true;

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.18, 0.95),
        gold
      );

      foot.position.set(x, -1.25, z);

      const collar = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.16, 0.78),
        gold
      );

      collar.position.set(x, 0.55, z);

      this.tableGroup.add(leg, foot, collar);
    }

    // Decorative front panel
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.75, 0.18),
      darkWood
    );

    frontPanel.position.set(0, 0.05, 5.25);
    this.tableGroup.add(frontPanel);

    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.08, 32),
      gold
    );

    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, 0.08, 5.37);

    this.tableGroup.add(emblem);

    // Place table in the royal hall
    this.tableGroup.position.y = 1.05;

    this.scene.add(this.tableGroup);
  }

  createChessBoard() {
    this.boardBuilder = new ChessBoardBuilder({
      squareSize: 1,
      boardY: 0.62,
      lightColor: 0xe8d9b8,
      darkColor: 0x392541,
      borderColor: COLORS.gold
    });

    this.tableGroup.add(this.boardBuilder.group);
  }

  createPieceGroup() {
    this.pieceGroup = new THREE.Group();
    this.pieceGroup.name = "apparachess-piece-group";

    this.scene.add(this.pieceGroup);
  }

  createCameraControls() {
    this.cameraController = new ChessCameraController(
      this.camera,
      this.renderer.domElement,
      {
        target: new THREE.Vector3(0, 1.7, 0),
        minDistance: 8,
        maxDistance: 25,
        rotateSpeed: 0.006,
        zoomSpeed: 0.12
      }
    );

    this.cameraController.setPreset("classic");
  }

  attachEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener(
      "pointerdown",
      this.boundPointerDown
    );

    canvas.addEventListener(
      "pointerup",
      this.boundPointerUp
    );

    canvas.addEventListener(
      "pointercancel",
      this.boundPointerUp
    );

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });

      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener("resize", this.boundResize);
    }
  }

  handlePointerDown(event) {
    if (this.disposed || event.button > 0) return;

    this.pointerStart = {
      x: event.clientX,
      y: event.clientY
    };

    this.activePointerId = event.pointerId;
    this.pointerMoved = false;

    const square = this.pickSquare(event);

    this.dragFromSquare = square;
    this.dragStartedOnPiece = Boolean(
      square && this.pieces.has(square)
    );

    if (this.dragStartedOnPiece && this.cameraController) {
      this.cameraController.setEnabled(false);
    }
  }

  handlePointerUp(event) {
    if (
      this.disposed ||
      this.activePointerId !== event.pointerId
    ) {
      return;
    }

    const start = this.pointerStart;

    const distance = start
      ? Math.hypot(
          event.clientX - start.x,
          event.clientY - start.y
        )
      : 0;

    const moved = distance > 9;
    const destination = this.pickSquare(event);

    if (
      moved &&
      this.dragStartedOnPiece &&
      this.dragFromSquare &&
      destination &&
      destination !== this.dragFromSquare
    ) {
      this.onPieceMove({
        from: this.dragFromSquare,
        to: destination
      });
    } else if (!moved && destination) {
      this.onSquareClick(destination);
    }

    if (this.cameraController) {
      this.cameraController.setEnabled(true);
    }

    this.pointerStart = null;
    this.activePointerId = null;
    this.pointerMoved = false;
    this.dragFromSquare = null;
    this.dragStartedOnPiece = false;
  }

  pickSquare(event) {
    if (!this.camera || !this.boardBuilder) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    this.pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera
    );

    const targets = [
      ...this.boardBuilder.group.children,
      ...this.pieceGroup.children
    ];

    const intersections = this.raycaster.intersectObjects(
      targets,
      true
    );

    if (!intersections.length) return null;

    for (const hit of intersections) {
      let object = hit.object;

      while (object) {
        if (object.userData && object.userData.square) {
          return object.userData.square;
        }

        object = object.parent;
      }
    }

    return null;
  }

/* =========================================================
   PART 2/4 END
   FILE CONTINUES — DO NOT SAVE YET
   ========================================================= */
     setPosition(board) {
    if (!Array.isArray(board) || board.length !== 8) {
      console.warn("APPARA CHESS: Invalid board position.");
      return false;
    }

    this.clearPieces();

    for (let row = 0; row < 8; row++) {
      if (!Array.isArray(board[row]) || board[row].length !== 8) {
        console.warn("APPARA CHESS: Invalid board row.");
        this.clearPieces();
        return false;
      }

      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece) continue;

        const square = `${FILES[col]}${8 - row}`;

        this.createPiece(
          piece.color,
          piece.type,
          square
        );
      }
    }

    this.position = board;
    return true;
  }

  createPiece(color, type, square) {
    if (!this.pieceGroup || !this.pieceFactory) return null;

    const piece = this.pieceFactory.create(color, type);

    if (!piece) return null;

    piece.name = `piece-${color}-${type}-${square}`;
    piece.userData.square = square;
    piece.userData.color = color;
    piece.userData.type = type;

    piece.traverse(object => {
      object.userData.square = square;
      object.userData.color = color;
      object.userData.type = type;

      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    const world = this.squareToWorld(square);

    piece.position.set(
      world.x,
      1.715,
      world.z
    );

    this.pieceGroup.add(piece);
    this.pieces.set(square, piece);

    return piece;
  }

  clearPieces() {
    if (!this.pieces) return;

    for (const [square, piece] of this.pieces) {
      this.pieceGroup?.remove(piece);

      piece.traverse(object => {
        if (object.geometry) {
          object.geometry.dispose();
        }
      });

      if (this.pieceFactory?.dispose) {
        this.pieceFactory.dispose(piece);
      } else {
        piece.traverse(object => {
          if (!object.material) return;

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          for (const material of materials) {
            material.dispose();
          }
        });
      }
    }

    this.pieces.clear();
  }

  removePiece(square) {
    const piece = this.pieces.get(square);

    if (!piece) return false;

    this.pieceGroup.remove(piece);

    piece.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }
    });

    if (this.pieceFactory?.dispose) {
      this.pieceFactory.dispose(piece);
    } else {
      piece.traverse(object => {
        if (!object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of materials) {
          material.dispose();
        }
      });
    }

    this.pieces.delete(square);

    return true;
  }

  squareToWorld(square) {
    if (
      typeof square !== "string" ||
      !/^[a-h][1-8]$/.test(square)
    ) {
      return null;
    }

    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]);

    return new THREE.Vector3(
      file - 3.5,
      1.715,
      4.5 - rank
    );
  }

  worldToSquare(point) {
    if (!point) return null;

    const file = Math.round(point.x + 3.5);
    const rank = Math.round(4.5 - point.z);

    if (
      file < 0 ||
      file > 7 ||
      rank < 1 ||
      rank > 8
    ) {
      return null;
    }

    return `${FILES[file]}${rank}`;
  }

  getSquareFromObject(object) {
    if (!object) return null;

    let current = object;

    while (current) {
      if (current.userData?.square) {
        return current.userData.square;
      }

      current = current.parent;
    }

    return null;
  }

  setSelection(square, legalSquares = []) {
    this.selectedSquare = square || null;

    this.legalSquares = Array.isArray(legalSquares)
      ? [...legalSquares]
      : [];

    if (!this.boardBuilder) return;

    this.boardBuilder.clearHighlights();

    if (this.selectedSquare) {
      this.boardBuilder.highlightSquare(
        this.selectedSquare,
        "selection"
      );
    }

    for (const target of this.legalSquares) {
      this.boardBuilder.highlightSquare(
        target,
        "legal"
      );
    }
  }

  highlightSquare(square, color = 0xffd700) {
    if (!this.boardBuilder || !square) return;

    const tile = this.boardBuilder.getSquareObject?.(square);

    if (!tile) {
      this.boardBuilder.highlightSquare(
        square,
        "lastMove"
      );
      return;
    }

    const material = tile.material;

    if (material?.emissive) {
      material.emissive.set(color);
      material.emissiveIntensity = 0.65;
    }
  }

  clearHighlights() {
    this.selectedSquare = null;
    this.legalSquares = [];

    this.boardBuilder?.clearHighlights();
  }

  async movePiece(from, to, options = {}) {
    const piece = this.pieces.get(from);

    if (!piece || !to) return false;

    const destination = this.squareToWorld(to);

    if (!destination) return false;

    const capturedPiece = this.pieces.get(to);

    if (capturedPiece && capturedPiece !== piece) {
      await this.animationController.capturePiece(
        capturedPiece
      );

      this.removePiece(to);
    }

    this.pieces.delete(from);

    piece.userData.square = to;
    piece.name = `piece-${piece.userData.color}-${piece.userData.type}-${to}`;

    piece.traverse(object => {
      object.userData.square = to;
    });

    await this.animationController.movePiece(
      piece,
      destination,
      {
        duration: options.duration ?? 0.42,
        hopHeight: options.hopHeight ?? 0.42
      }
    );

    this.pieces.set(to, piece);

    this.clearHighlights();

    return true;
  }

/* =========================================================
   PART 3/4 END
   FILE CONTINUES — DO NOT SAVE YET
   ========================================================= */
     setCameraView(view = "classic") {
    if (!this.cameraController) return;

    const presets = {
      classic: "classic",
      top: "top",
      cinematic: "cinematic",
      close: "close",
      white: "white",
      black: "black"
    };

    const preset = presets[view] || "classic";

    this.cameraController.setPreset(preset);
  }

  zoom(factor = 1) {
    if (!this.cameraController) return;

    this.cameraController.zoom(factor);
  }

  resetCamera() {
    if (!this.cameraController) return;

    this.cameraController.reset();
  }

  rotateCamera(horizontal, vertical) {
    if (!this.cameraController) return;

    this.cameraController.rotate(
      horizontal,
      vertical
    );
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }

    const width = Math.max(
      1,
      this.container.clientWidth
    );

    const height = Math.max(
      1,
      this.container.clientHeight
    );

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      width,
      height,
      false
    );

    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        this.options.pixelRatioLimit
      )
    );
  }

  animate() {
    if (this.disposed || !this.renderer) return;

    this.animationFrame = requestAnimationFrame(
      () => this.animate()
    );

    if (!this.clock) {
      this.clock = new THREE.Clock();
    }

    const delta = Math.min(
      this.clock.getDelta(),
      0.05
    );

    if (this.cameraController) {
      this.cameraController.update(delta);
    }

    if (this.animationController) {
      this.animationController.update(delta);
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else {
      window.removeEventListener(
        "resize",
        this.boundResize
      );
    }

    if (this.renderer) {
      const canvas = this.renderer.domElement;

      canvas.removeEventListener(
        "pointerdown",
        this.boundPointerDown
      );

      canvas.removeEventListener(
        "pointerup",
        this.boundPointerUp
      );

      canvas.removeEventListener(
        "pointercancel",
        this.boundPointerUp
      );
    }

    if (this.cameraController) {
      this.cameraController.dispose();
      this.cameraController = null;
    }

    if (this.animationController) {
      this.animationController.dispose();
      this.animationController = null;
    }

    this.clearPieces();

    if (this.boardBuilder) {
      this.boardBuilder.dispose();
      this.boardBuilder = null;
    }

    // Dispose remaining scene resources only once.
    if (this.scene) {
      const geometries = new Set();
      const materials = new Set();

      this.scene.traverse(object => {
        if (object.geometry) {
          geometries.add(object.geometry);
        }

        if (object.material) {
          const list = Array.isArray(object.material)
            ? object.material
            : [object.material];

          for (const material of list) {
            if (material) materials.add(material);
          }
        }
      });

      for (const geometry of geometries) {
        geometry.dispose();
      }

      for (const material of materials) {
        material.dispose();
      }

      this.scene.clear();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();

      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement
        );
      }

      this.renderer = null;
    }

    this.pieces.clear();

    this.container = null;
    this.scene = null;
    this.camera = null;
    this.roomGroup = null;
    this.tableGroup = null;
    this.pieceGroup = null;
    this.position = null;
    this.clock = null;
  }
}

export function createThreeChessEngine(options = {}) {
  return new ThreeChessEngine(options);
}

/* =========================================================
   PART 4/4 END
   FULL FILE COMPLETE
   FILE: js/3d/three-engine.js
   ========================================================= */
