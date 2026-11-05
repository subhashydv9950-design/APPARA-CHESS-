
/* =========================================================
   APPARA CHESS
   PHASE 1 — 3D CHESS ENGINE
   FILE: js/3d/three-engine.js

   PURPOSE:
   Premium 3D Royal Chess Arena
   - Three.js renderer
   - Royal chess environment
   - 3D table and board
   - 32 procedural 3D chess pieces
   - Camera controls
   - Mobile touch and desktop pointer support
   - Board position rendering

   DEPENDENCY:
   Three.js 0.180.0
========================================================= */

import * as THREE from "three";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const COLORS = {
  room: 0x100b1b,
  floor: 0x17111e,
  gold: 0xc9a45c,
  goldLight: 0xf0d69a,
  darkWood: 0x26170f,
  lightWood: 0xd6bd91,
  white: 0xf2ead8,
  black: 0x24212a,
  whiteMetal: 0xe5d7bd,
  blackMetal: 0x9a7543,
  selection: 0x55d9ff,
  legal: 0x53d68b
};

export class ThreeChessEngine {
  constructor(options = {}) {
    this.options = {
      antialias: true,
      shadows: true,
      pixelRatioLimit: 1.75,
      boardSize: 8,
      ...options
    };

    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.boardGroup = null;
    this.pieceGroup = null;
    this.roomGroup = null;

    this.tiles = new Map();
    this.pieces = new Map();

    this.selectedSquare = null;
    this.legalSquares = [];
    this.position = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.dragging = false;
    this.pointerStart = null;
    this.activePointerId = null;

    this.animationFrame = 0;
    this.resizeObserver = null;
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
    this.createBoard();
    this.createStartingPieces();
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
    this.camera.lookAt(0, 0.5, 0);
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

    this.renderer.domElement.className =
      "apparachess-3d-canvas";

    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";

    this.container.replaceChildren(
      this.renderer.domElement
    );
  }

  createLighting() {
    const ambient = new THREE.HemisphereLight(
      0xe9ddff,
      0x261626,
      2.0
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
      0x8044db,
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

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: COLORS.floor,
        roughness: 0.38,
        metalness: 0.12
      })
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

    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 18, 40),
      wallMaterial
    );

    sideWall.position.set(-20, 8.5, 0);
    this.roomGroup.add(sideWall);

    const rightWall = sideWall.clone();
    rightWall.position.x = 20;
    this.roomGroup.add(rightWall);

    this.createPillars();

    this.scene.add(this.roomGroup);
  }

  createPillars() {
    const material = new THREE.MeshStandardMaterial({
      color: 0x33243f,
      metalness: 0.35,
      roughness: 0.45
    });

    const trim = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.78,
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
          16
        ),
        material
      );

      pillar.position.set(x, 3.6, z);
      pillar.castShadow = true;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.9,
          0.9,
          0.28,
          24
        ),
        trim
      );

      base.position.set(x, -0.28, z);

      const top = base.clone();
      top.position.y = 7.5;

      this.roomGroup.add(pillar, base, top);
    }
  }

  createChessTable() {
    const table = new THREE.Group();

    const wood = new THREE.MeshStandardMaterial({
      color: COLORS.darkWood,
      roughness: 0.3,
      metalness: 0.12
    });

    const gold = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.82,
      roughness: 0.22
    });

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.48, 10.2),
      wood
    );

    top.position.y = 0;
    top.castShadow = true;
    top.receiveShadow = true;

    table.add(top);

    const goldFrame = new THREE.Mesh(
      new THREE.BoxGeometry(10.35, 0.12, 10.35),
      gold
    );

    goldFrame.position.y = -0.28;
    table.add(goldFrame);

    for (const x of [-4.35, 4.35]) {
      for (const z of [-4.35, 4.35]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 1.8, 0.5),
          wood
        );

        leg.position.set(x, -1.35, z);
        leg.castShadow = true;

        table.add(leg);
      }
    }

    table.position.y = 1.05;

    this.scene.add(table);
  }

  createBoard() {
    this.boardGroup = new THREE.Group();

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.lightWood,
      roughness: 0.32,
      metalness: 0.04
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x493026,
      roughness: 0.3,
      metalness: 0.08
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.82,
      roughness: 0.22
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8.55, 0.28, 8.55),
      goldMaterial
    );

    base.position.y = 0.29;
    base.castShadow = true;
    base.receiveShadow = true;

    this.boardGroup.add(base);

    const boardBacking = new THREE.Mesh(
      new THREE.BoxGeometry(8.3, 0.16, 8.3),
      darkMaterial
    );

    boardBacking.position.y = 0.49;
    this.boardGroup.add(boardBacking);

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = `${FILES[file]}${8 - rank}`;

        const material = (
          (rank + file) % 2 === 0
            ? lightMaterial
            : darkMaterial
        );

        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.09, 1),
          material.clone()
        );

        tile.position.set(
          file - 3.5,
          0.62,
          rank - 3.5
        );

        tile.receiveShadow = true;
        tile.castShadow = true;

        tile.userData.square = square;
        tile.userData.baseColor =
          material.color.getHex();

        this.tiles.set(square, tile);
        this.boardGroup.add(tile);
      }
    }

    this.boardGroup.position.y = 1.05;

    this.scene.add(this.boardGroup);
  }

  createStartingPieces() {
    const backRank = [
      "r", "n", "b", "q", "k", "b", "n", "r"
    ];

    for (let file = 0; file < 8; file++) {
      this.createPiece("w", backRank[file], `${FILES[file]}1`);
      this.createPiece("w", "p", `${FILES[file]}2`);

      this.createPiece("b", backRank[file], `${FILES[file]}8`);
      this.createPiece("b", "p", `${FILES[file]}7`);
    }
  }

  createPiece(color, type, square) {
    const key = square;

    if (this.pieces.has(key)) {
      this.removePiece(key);
    }

    const group = this.buildPieceModel(color, type);

    const position = this.squareToWorld(square);

    group.position.set(
      position.x,
      1.75,
      position.z
    );

    group.userData.square = square;
    group.userData.color = color;
    group.userData.type = type;

    group.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.square = square;
      }
    });

    this.pieces.set(key, group);
    this.pieceGroup ||= new THREE.Group();

    if (!this.pieceGroup.parent) {
      this.scene.add(this.pieceGroup);
    }

    this.pieceGroup.add(group);

    return group;
  }

  buildPieceModel(color, type) {
    const group = new THREE.Group();

    const isWhite = color === "w";

    const mainMaterial = new THREE.MeshStandardMaterial({
      color: isWhite ? COLORS.white : COLORS.black,
      roughness: isWhite ? 0.24 : 0.3,
      metalness: isWhite ? 0.18 : 0.48
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: isWhite ? COLORS.whiteMetal : COLORS.blackMetal,
      metalness: 0.82,
      roughness: 0.2
    });

    const addCylinder = (
      radiusTop,
      radiusBottom,
      height,
      y,
      material = mainMaterial
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radiusTop,
          radiusBottom,
          height,
          32
        ),
        material
      );

      mesh.position.y = y;
      group.add(mesh);

      return mesh;
    };

    const addSphere = (
      radius,
      x,
      y,
      z,
      material = mainMaterial
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 18),
        material
      );

      mesh.position.set(x, y, z);
      group.add(mesh);

      return mesh;
    };

    // Common royal base
    addCylinder(0.31, 0.38, 0.13, 0.07, accentMaterial);
    addCylinder(0.25, 0.31, 0.12, 0.19, mainMaterial);
    addCylinder(0.18, 0.25, 0.12, 0.31, accentMaterial);

    if (type === "p") {
      addCylinder(0.13, 0.17, 0.3, 0.49);
      addSphere(0.17, 0, 0.72, 0);
    }

    if (type === "r") {
      addCylinder(0.19, 0.22, 0.55, 0.64);
      addCylinder(0.28, 0.22, 0.12, 0.97, accentMaterial);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.2, 0.48),
        mainMaterial
      );

      crown.position.y = 1.12;
      group.add(crown);

      for (let x of [-0.16, 0, 0.16]) {
        for (let z of [-0.16, 0.16]) {
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.14, 0.1),
            accentMaterial
          );

          block.position.set(x, 1.28, z);
          group.add(block);
        }
      }
    }

    if (type === "b") {
      addCylinder(0.17, 0.22, 0.48, 0.62);

      const body = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.2,
          24,
          24
        ),
        mainMaterial
      );

      body.scale.set(0.82, 1.35, 0.82);
      body.position.y = 1.0;
      group.add(body);

      addSphere(0.075, 0, 1.25, 0, accentMaterial);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.22, 20),
        accentMaterial
      );

      tip.position.y = 1.4;
      group.add(tip);
    }

    if (type === "q") {
      addCylinder(0.17, 0.22, 0.55, 0.63);
      addSphere(0.22, 0, 1.0, 0);

      addCylinder(0.23, 0.16, 0.1, 1.17, accentMaterial);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.19,
          24,
          16
        ),
        mainMaterial
      );

      crown.position.y = 1.31;
      group.add(crown);

      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;

        addSphere(
          0.055,
          Math.cos(angle) * 0.17,
          1.48,
          Math.sin(angle) * 0.17,
          accentMaterial
        );
      }

      addSphere(0.08, 0, 1.53, 0, accentMaterial);
    }

    if (type === "k") {
      addCylinder(0.18, 0.23, 0.62, 0.65);
      addSphere(0.2, 0, 1.04, 0);

      addCylinder(0.22, 0.16, 0.12, 1.18, accentMaterial);

      addCylinder(0.055, 0.055, 0.42, 1.46, accentMaterial);

      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.06, 0.06),
        accentMaterial
      );

      cross.position.y = 1.55;
      group.add(cross);
    }

    if (type === "n") {
      addCylinder(0.18, 0.22, 0.42, 0.59);

      const neck = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.58, 0.2),
        mainMaterial
      );

      neck.position.set(0, 0.94, 0.01);
      neck.rotation.z = -0.28;
      group.add(neck);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.2,
          24,
          20
        ),
        mainMaterial
      );

      head.position.set(0, 1.23, 0.06);
      head.scale.set(0.85, 1.1, 1.35);
      group.add(head);

      const muzzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.32, 20),
        mainMaterial
      );

      muzzle.position.set(0, 1.16, 0.28);
      muzzle.rotation.x = Math.PI / 2;
      group.add(muzzle);

      for (const x of [-0.11, 0.11]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.22, 16),
          accentMaterial
        );

        ear.position.set(x, 1.47, 0.02);
        group.add(ear);
      }

      addSphere(0.035, -0.13, 1.28, 0.2, accentMaterial);
      addSphere(0.035, 0.13, 1.28, 0.2, accentMaterial);
    }

    return group;
  }

  squareToWorld(square) {
    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]);

    if (file < 0 || rank < 1 || rank > 8) {
      throw new Error(`Invalid chess square: ${square}`);
    }

    return {
      x: file - 3.5,
      z: 4.5 - rank
    };
  }

  worldToSquare(point) {
    const file = Math.round(point.x + 3.5);
    const rank = 8 - Math.round(point.z + 3.5);

    if (
      file < 0 || file > 7 ||
      rank < 1 || rank > 8
    ) {
      return null;
    }

    return `${FILES[file]}${rank}`;
  }

  removePiece(square) {
    const piece = this.pieces.get(square);

    if (!piece) return false;

    this.pieceGroup?.remove(piece);

    piece.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.pieces.delete(square);

    return true;
  }

  clearPieces() {
    for (const square of [...this.pieces.keys()]) {
      this.removePiece(square);
    }
  }

  setPosition(board) {
    if (!Array.isArray(board) || board.length !== 8) {
      throw new TypeError("An 8x8 chess board array is required.");
    }

    this.clearPieces();

    for (let row = 0; row < 8; row++) {
      if (!Array.isArray(board[row]) || board[row].length !== 8) {
        throw new TypeError("Every chess board row must contain 8 squares.");
      }

      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece) continue;

        const color = piece.color;
        const type = piece.type;

        const square = `${FILES[col]}${8 - row}`;

        this.createPiece(color, type, square);
      }
    }
  }

  highlightSquare(square, color = COLORS.selection) {
    const tile = this.tiles.get(square);

    if (!tile) return false;

    tile.material.emissive = new THREE.Color(color);
    tile.material.emissiveIntensity = 0.48;

    return true;
  }

  clearHighlights() {
    for (const tile of this.tiles.values()) {
      tile.material.emissive.setHex(0x000000);
      tile.material.emissiveIntensity = 0;
    }
  }

  setSelection(square, legalSquares = []) {
    this.clearHighlights();

    this.selectedSquare = square;
    this.legalSquares = [...legalSquares];

    if (square) {
      this.highlightSquare(square, COLORS.selection);
    }

    for (const target of this.legalSquares) {
      this.highlightSquare(target, COLORS.legal);
    }
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

    this.resizeObserver = new ResizeObserver(
      this.boundResize
    );

    this.resizeObserver.observe(this.container);
  }

  handlePointerDown(event) {
    if (this.disposed) return;

    this.activePointerId = event.pointerId;

    this.pointerStart = {
      x: event.clientX,
      y: event.clientY
    };

    this.dragging = false;
  }

  handlePointerUp(event) {
    if (this.disposed) return;

    if (this.activePointerId !== event.pointerId) {
      return;
    }

    const distance = this.pointerStart
      ? Math.hypot(
          event.clientX - this.pointerStart.x,
          event.clientY - this.pointerStart.y
        )
      : 0;

    this.dragging = distance > 12;

    this.pointerStart = null;
    this.activePointerId = null;

    this.pickSquare(event);

    this.dragging = false;
  }

  pickSquare(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera
    );

    const targets = [
      ...this.tiles.values(),
      ...[...this.pieces.values()].flatMap(piece => {
        const meshes = [];
        piece.traverse(object => {
          if (object.isMesh) meshes.push(object);
        });
        return meshes;
      })
    ];

    const hits = this.raycaster.intersectObjects(
      targets,
      false
    );

    if (!hits.length) return;

    const square = hits[0].object.userData.square;

    if (square) {
      this.onSquareClick(square);
    }
  }

  movePiece(from, to, animate = true) {
    const piece = this.pieces.get(from);

    if (!piece) return false;

    const destination = this.squareToWorld(to);

    this.pieces.delete(from);
    this.removePiece(to);

    this.pieces.set(to, piece);

    piece.userData.square = to;

    piece.traverse(object => {
      if (object.isMesh) {
        object.userData.square = to;
      }
    });

    const start = piece.position.clone();

    const end = new THREE.Vector3(
      destination.x,
      1.75,
      destination.z
    );

    if (!animate) {
      piece.position.copy(end);
      return true;
    }

    const duration = 260;
    const started = performance.now();

    const step = now => {
      if (this.disposed) return;

      const progress = Math.min(
        (now - started) / duration,
        1
      );

      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      piece.position.lerpVectors(
        start,
        end,
        eased
      );
      piece.position.y +=
        Math.sin(progress * Math.PI) * 0.35;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        piece.position.copy(end);
      }
    };

    requestAnimationFrame(step);

    this.onPieceMove({ from, to });

    return true;
  }

  setCameraView(view = "classic") {
    const views = {
      classic: [10, 12, 15],
      top: [0, 20, 0.01],
      cinematic: [13, 8, 17],
      close: [6, 8, 9]
    };

    const position = views[view] || views.classic;

    this.camera.position.set(...position);
    this.camera.lookAt(0, 1, 0);
  }
  zoom(amount = 1) {
    const direction = this.camera.position
      .clone()
      .sub(new THREE.Vector3(0, 1, 0));

    direction.multiplyScalar(amount);

    this.camera.position
      .copy(direction.add(new THREE.Vector3(0, 1, 0)));
  }

  resetCamera() {
    this.setCameraView("classic");
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  animate() {
    if (this.disposed) return;

    this.animationFrame = requestAnimationFrame(
      () => this.animate()
    );

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;

    cancelAnimationFrame(this.animationFrame);

    this.resizeObserver?.disconnect();

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
    }

    this.scene?.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.renderer?.dispose();
    this.renderer?.domElement.remove();

    this.tiles.clear();
    this.pieces.clear();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
  }
}

/* =========================================================
   PHASE 1 — 3D ENGINE FILE COMPLETE
   NOTE:
   This is the first visual engine foundation.
   Full chess-screen integration and rule validation
   will be connected in the next development step.
========================================================= */
