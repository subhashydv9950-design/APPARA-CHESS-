
/* =========================================================
   APPARA CHESS — FILE 69
   PATH: js/3d/chess-scene.js
   PART 1/2
   PURPOSE: Premium 3D Chess Board and Piece Renderer
   ========================================================= */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const BOARD_OFFSET = (BOARD_SIZE * SQUARE_SIZE) / 2;

const COLORS = {
  background: 0x090711,
  floor: 0x171020,
  boardLight: 0xe7d9bd,
  boardDark: 0x342343,
  gold: 0xd9ad58,
  goldLight: 0xffdf9b,
  whitePiece: 0xf4eee2,
  blackPiece: 0x292333,
  highlight: 0x57d9ff,
  selected: 0xffd166
};

export class ChessScene {
  constructor(options = {}) {
    this.container = options.container || null;
    this.document = options.document || globalThis.document;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.boardGroup = null;
    this.pieceGroup = null;
    this.highlightGroup = null;

    this.pieceMeshes = new Map();
    this.squareMeshes = new Map();

    this.animationFrame = null;
    this.resizeObserver = null;

    this.initialized = false;
    this.destroyed = false;

    this.quality = options.quality || "auto";
    this.allowRotation = options.allowRotation !== false;

    this.onSquareClick =
      typeof options.onSquareClick === "function"
        ? options.onSquareClick
        : null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.boundPointer = event => this.handlePointer(event);
    this.boundResize = () => this.resize();
  }

  /* -------------------------------------------------------
     1. INITIALIZE
  ------------------------------------------------------- */

  initialize(container = this.container) {
    if (this.initialized) return this;

    if (!container) {
      throw new Error("ChessScene requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createEnvironment();
    this.createBoard();
    this.createPieceGroup();
    this.createHighlights();
    this.createControls();
    this.bindEvents();

    this.initialized = true;
    this.resize();
    this.animate();

    return this;
  }

  /* -------------------------------------------------------
     2. SCENE
  ------------------------------------------------------- */

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);

    this.scene.fog = new THREE.Fog(
      COLORS.background,
      13,
      27
    );
  }

  /* -------------------------------------------------------
     3. CAMERA
  ------------------------------------------------------- */

  createCamera() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(
      38,
      width / height,
      0.1,
      100
    );

    this.camera.position.set(8.8, 10.5, 9.5);
    this.camera.lookAt(0, 0, 0);
  }

  /* -------------------------------------------------------
     4. RENDERER
  ------------------------------------------------------- */

  createRenderer() {
    const isMobile =
      globalThis.matchMedia?.("(max-width: 700px)")?.matches;

    const pixelRatio = this.quality === "high"
      ? 2
      : isMobile
        ? 1
        : Math.min(globalThis.devicePixelRatio || 1, 1.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance"
    });

    this.renderer.setPixelRatio(pixelRatio);

    this.renderer.setSize(
      Math.max(1, this.container.clientWidth),
      Math.max(1, this.container.clientHeight)
    );

    this.renderer.shadowMap.enabled = !isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.renderer.domElement.className = "ac-3d-canvas";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D chess board"
    );

    this.container.appendChild(this.renderer.domElement);
  }

  /* -------------------------------------------------------
     5. LIGHTING
  ------------------------------------------------------- */

  createLights() {
    const ambient = new THREE.AmbientLight(
      0xffffff,
      1.15
    );

    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(
      COLORS.goldLight,
      2.5
    );

    keyLight.position.set(5, 10, 6);
    keyLight.castShadow = this.renderer.shadowMap.enabled;

    keyLight.shadow.mapSize.set(1024, 1024);

    this.scene.add(keyLight);

    const purpleLight = new THREE.PointLight(
      0x8c42ff,
      22,
      18
    );

    purpleLight.position.set(-5, 4, -4);
    this.scene.add(purpleLight);

    const blueLight = new THREE.PointLight(
      0x4b9fff,
      12,
      14
    );

    blueLight.position.set(5, 3, -5);
    this.scene.add(blueLight);
  }

  /* -------------------------------------------------------
     6. PALACE FLOOR
  ------------------------------------------------------- */

  createEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(40, 40);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.72,
      metalness: 0.2
    });

    const floor = new THREE.Mesh(
      floorGeometry,
      floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.24;
    floor.receiveShadow = true;

    this.scene.add(floor);

    const platformGeometry = new THREE.BoxGeometry(
      9.2,
      0.34,
      9.2
    );

    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x21162e,
      metalness: 0.72,
      roughness: 0.3
    });

    const platform = new THREE.Mesh(
      platformGeometry,
      platformMaterial
    );

    platform.position.y = -0.08;
    platform.receiveShadow = true;
    platform.castShadow = true;

    this.scene.add(platform);

    const edgeGeometry = new THREE.BoxGeometry(
      9.35,
      0.08,
      9.35
    );

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.85,
      roughness: 0.22
    });

    const edge = new THREE.Mesh(
      edgeGeometry,
      edgeMaterial
    );

    edge.position.y = -0.25;
    this.scene.add(edge);
  }

  /* -------------------------------------------------------
     7. CHESS BOARD
  ------------------------------------------------------- */

  createBoard() {
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "APPARA-Chess-Board";

    const frameGeometry = new THREE.BoxGeometry(
      8.35,
      0.22,
      8.35
    );

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.78,
      roughness: 0.25
    });

    const frame = new THREE.Mesh(
      frameGeometry,
      frameMaterial
    );

    frame.position.y = 0;
    frame.castShadow = true;
    frame.receiveShadow = true;

    this.boardGroup.add(frame);

    const squareGeometry = new THREE.BoxGeometry(
      SQUARE_SIZE,
      0.08,
      SQUARE_SIZE
    );

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.boardLight,
      roughness: 0.38,
      metalness: 0.08
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.boardDark,
      roughness: 0.35,
      metalness: 0.18
    });

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const square = new THREE.Mesh(
          squareGeometry,
          (row + col) % 2 === 0
            ? lightMaterial
            : darkMaterial
        );

        const file = String.fromCharCode(97 + col);
        const rank = String(8 - row);
        const squareName = file + rank;

        square.position.set(
          this.fileToX(file),
          0.15,
          this.rankToZ(rank)
        );

        square.userData.square = squareName;
        square.receiveShadow = true;

        this.boardGroup.add(square);
        this.squareMeshes.set(squareName, square);
      }
    }

    this.scene.add(this.boardGroup);
  }

  /* -------------------------------------------------------
     8. PIECE GROUP
  ------------------------------------------------------- */

  createPieceGroup() {
    this.pieceGroup = new THREE.Group();
    this.pieceGroup.name = "APPARA-Chess-Pieces";
    this.scene.add(this.pieceGroup);
  }

  /* -------------------------------------------------------
     9. PIECE MATERIAL
  ------------------------------------------------------- */

  createPieceMaterial(color) {
    const isWhite = color === "w";

    return new THREE.MeshStandardMaterial({
      color: isWhite
        ? COLORS.whitePiece
        : COLORS.blackPiece,
      metalness: isWhite ? 0.35 : 0.62,
      roughness: isWhite ? 0.25 : 0.22
    });
  }

  /* -------------------------------------------------------
     10. PIECE MODEL
  ------------------------------------------------------- */

  createPieceMesh(piece) {
    const group = new THREE.Group();

    const material = this.createPieceMaterial(piece.color);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.88,
      roughness: 0.2
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.34, 0.13, 32),
      goldMaterial
    );

    base.position.y = 0.23;
    base.castShadow = true;
    group.add(base);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.24, 0.28, 24),
      material
    );

    stem.position.y = 0.42;
    stem.castShadow = true;
    group.add(stem);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.035, 8, 24),
      goldMaterial
    );

    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    group.add(ring);

    const head = this.createPieceHead(
      piece.type,
      material,
      goldMaterial
    );

    head.position.y = 0.68;
    group.add(head);

    group.userData.piece = {
      type: piece.type,
      color: piece.color
    };

    group.scale.setScalar(0.9);

    return group;
  }

  /* -------------------------------------------------------
     11. PIECE HEAD SHAPES
  ------------------------------------------------------- */

  createPieceHead(type, material, goldMaterial) {
    const group = new THREE.Group();

    if (type === "p") {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 24, 20),
        material
      );

      head.position.y = 0.1;
      group.add(head);

    } else if (type === "r") {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.2, 0.35, 8),
        material
      );

      tower.position.y = 0.13;
      group.add(tower);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.12, 0.42),
        goldMaterial
      );

      crown.position.y = 0.34;
      group.add(crown);

    } else if (type === "n") {
      const horse = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.48, 5),
        material
      );

      horse.position.y = 0.18;
      horse.rotation.z = -0.22;
      group.add(horse);

    } else if (type === "b") {
      const bishop = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 20, 20),
        material
      );

      bishop.scale.set(0.75, 1.3, 0.75);
      bishop.position.y = 0.16;
      group.add(bishop);

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 12),
        goldMaterial
      );

      tip.position.y = 0.44;
      group.add(tip);

    } else if (type === "q" || type === "k") {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(
          type === "k" ? 0.24 : 0.22,
          0.42,
          type === "k" ? 4 : 12
        ),
        goldMaterial
      );

      crown.position.y = 0.18;
      group.add(crown);

      if (type === "k") {
        const crossBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.07, 0.07),
          goldMaterial
        );

        crossBar.position.y = 0.47;
        group.add(crossBar);

        const crossTop = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.28, 0.07),
          goldMaterial
        );

        crossTop.position.y = 0.55;
        group.add(crossTop);
      }
    }

    group.traverse(object => {
      if (object.isMesh) object.castShadow = true;
    });

    return group;
  }

  /* =======================================================
     FILE 69 — PART 1/2 END
     PART 2 इसी के नीचे जोड़ना है।
     अभी Commit मत करना।
  ======================================================= */
         
  /* -------------------------------------------------------
     12. HIGHLIGHT GROUP
  ------------------------------------------------------- */

  createHighlights() {
    this.highlightGroup = new THREE.Group();
    this.highlightGroup.name = "APPARA-Chess-Highlights";
    this.scene.add(this.highlightGroup);
  }

  clearHighlights() {
    if (!this.highlightGroup) return;

    while (this.highlightGroup.children.length) {
      const object = this.highlightGroup.children[0];

      this.highlightGroup.remove(object);

      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material?.dispose();
      }
    }
  }

  highlightSquare(square, color = COLORS.highlight) {
    if (!this.highlightGroup || !this.isValidSquare(square)) {
      return false;
    }

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    });

    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.82),
      material
    );

    marker.rotation.x = -Math.PI / 2;
    marker.position.set(
      this.fileToX(square[0]),
      0.205,
      this.rankToZ(square[1])
    );

    marker.userData.square = square;

    this.highlightGroup.add(marker);

    return true;
  }

  showLegalMoves(squares = []) {
    this.clearHighlights();

    for (const square of squares) {
      this.highlightSquare(square, COLORS.highlight);
    }
  }

  selectSquare(square) {
    this.clearHighlights();

    this.highlightSquare(square, COLORS.selected);
  }

  /* -------------------------------------------------------
     13. LOAD CHESS POSITION
  ------------------------------------------------------- */

  loadPosition(position) {
    if (!this.initialized || this.destroyed) return false;

    const board = Array.isArray(position)
      ? position
      : position?.board;

    if (!Array.isArray(board) || board.length !== 8) {
      console.error("Invalid chess board position.");
      return false;
    }

    this.clearPieces();

    for (let row = 0; row < 8; row++) {
      if (!Array.isArray(board[row]) || board[row].length !== 8) {
        console.error("Invalid chess board row:", row);
        this.clearPieces();
        return false;
      }

      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece) continue;

        if (
          !["w", "b"].includes(piece.color) ||
          !["k", "q", "r", "b", "n", "p"].includes(piece.type)
        ) {
          console.warn("Skipped invalid chess piece:", piece);
          continue;
        }

        const square =
          String.fromCharCode(97 + col) +
          String(8 - row);

        this.addPiece(piece, square);
      }
    }

    return true;
  }

  clearPieces() {
    if (!this.pieceGroup) return;

    for (const child of [...this.pieceGroup.children]) {
      this.pieceGroup.remove(child);

      child.traverse(object => {
        if (!object.isMesh) return;

        object.geometry?.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material?.dispose();
        }
      });
    }

    this.pieceMeshes.clear();
  }

  /* -------------------------------------------------------
     14. ADD / REMOVE PIECES
  ------------------------------------------------------- */

  addPiece(piece, square) {
    if (!this.isValidSquare(square)) return false;

    const mesh = this.createPieceMesh(piece);

    mesh.position.set(
      this.fileToX(square[0]),
      0,
      this.rankToZ(square[1])
    );

    mesh.userData.square = square;

    this.pieceGroup.add(mesh);
    this.pieceMeshes.set(square, mesh);

    return true;
  }

  removePiece(square) {
    const mesh = this.pieceMeshes.get(square);

    if (!mesh) return false;

    this.pieceGroup.remove(mesh);
    this.pieceMeshes.delete(square);

    mesh.traverse(object => {
      if (!object.isMesh) return;

      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material?.dispose();
      }
    });

    return true;
  }

  /* -------------------------------------------------------
     15. MOVE PIECE
  ------------------------------------------------------- */

  movePiece(from, to, options = {}) {
    if (
      !this.isValidSquare(from) ||
      !this.isValidSquare(to)
    ) {
      return false;
    }

    const mesh = this.pieceMeshes.get(from);

    if (!mesh) return false;

    this.removePiece(to);

    this.pieceMeshes.delete(from);
    this.pieceMeshes.set(to, mesh);

    mesh.userData.square = to;

    const target = new THREE.Vector3(
      this.fileToX(to[0]),
      options.animate === false ? 0 : 0.48,
      this.rankToZ(to[1])
    );

    if (options.animate === false) {
      mesh.position.copy(target);
      mesh.position.y = 0;
      return true;
    }

    const start = mesh.position.clone();
    const duration = 220;
    const startedAt = performance.now();

    const animateMove = now => {
      if (this.destroyed) return;

      const progress = Math.min(
        1,
        (now - startedAt) / duration
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      mesh.position.lerpVectors(start, target, eased);

      if (progress < 1) {
        requestAnimationFrame(animateMove);
      } else {
        mesh.position.y = 0;
      }
    };

    requestAnimationFrame(animateMove);

    return true;
  }

  /* -------------------------------------------------------
     16. BOARD COORDINATES
  ------------------------------------------------------- */

  fileToX(file) {
    const col = file.charCodeAt(0) - 97;
    return col * SQUARE_SIZE - BOARD_OFFSET + 0.5;
  }

  rankToZ(rank) {
    const row = 8 - Number(rank);
    return row * SQUARE_SIZE - BOARD_OFFSET + 0.5;
  }

  isValidSquare(square) {
    return (
      typeof square === "string" &&
      /^[a-h][1-8]$/.test(square)
    );
  }

  /* -------------------------------------------------------
     17. ORBIT CONTROLS
  ------------------------------------------------------- */

  createControls() {
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );

    this.controls.target.set(0, 0, 0);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.controls.enablePan = false;

    this.controls.enableRotate = this.allowRotation;

    this.controls.minDistance = 8;
    this.controls.maxDistance = 17;

    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2.15;

    this.controls.update();
  }

  /* -------------------------------------------------------
     18. POINTER / SQUARE SELECTION
  ------------------------------------------------------- */

  bindEvents() {
    this.renderer.domElement.addEventListener(
      "pointerup",
      this.boundPointer
    );

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(
        this.boundResize
      );

      this.resizeObserver.observe(this.container);
    } else {
      globalThis.addEventListener?.(
        "resize",
        this.boundResize
      );
    }
  }

  handlePointer(event) {
    if (this.destroyed || !this.onSquareClick) return;

    const rect = this.renderer.domElement.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    this.pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera
    );

    const targets = [
      ...this.pieceGroup.children,
      ...this.squareMeshes.values()
    ];

    const intersections = this.raycaster.intersectObjects(
      targets,
      true
    );

    if (!intersections.length) return;

    let object = intersections[0].object;

    while (object && !object.userData.square) {
      object = object.parent;
    }

    const square = object?.userData?.square;

    if (this.isValidSquare(square)) {
      this.onSquareClick(square);
    }
  }

  /* -------------------------------------------------------
     19. RESIZE
  ------------------------------------------------------- */

  resize() {
    if (!this.renderer || !this.camera || !this.container) {
      return;
    }

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  /* -------------------------------------------------------
     20. RENDER LOOP
  ------------------------------------------------------- */

  animate() {
    if (this.destroyed) return;

    this.animationFrame = requestAnimationFrame(() => {
      this.animate();
    });

    this.controls?.update();

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  /* -------------------------------------------------------
     21. CAMERA PRESETS
  ------------------------------------------------------- */

  setCameraView(view = "default") {
    if (!this.camera || !this.controls) return;

    const views = {
      default: [8.8, 10.5, 9.5],
      top: [0, 15, 0.01],
      white: [0, 9, 12],
      black: [0, 9, -12]
    };

    const position = views[view] || views.default;

    this.camera.position.set(...position);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /* -------------------------------------------------------
     22. QUALITY SETTINGS
  ------------------------------------------------------- */

  setQuality(quality = "auto") {
    this.quality = quality;

    if (!this.renderer) return;

    const ratio = quality === "high"
      ? 2
      : quality === "low"
        ? 1
        : Math.min(globalThis.devicePixelRatio || 1, 1.5);

    this.renderer.setPixelRatio(ratio);

    this.renderer.shadowMap.enabled = quality !== "low";

    this.resize();
  }

  /* -------------------------------------------------------
     23. DISPOSE
  ------------------------------------------------------- */

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.renderer?.domElement?.removeEventListener(
      "pointerup",
      this.boundPointer
    );

    globalThis.removeEventListener?.(
      "resize",
      this.boundResize
    );

    this.controls?.dispose();

    this.clearHighlights();
    this.clearPieces();

    for (const square of this.squareMeshes.values()) {
      square.geometry?.dispose();
    }

    this.squareMeshes.clear();

    this.renderer?.dispose();
    this.renderer?.domElement?.remove();

    this.scene?.traverse(object => {
      if (!object.isMesh) return;

      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material?.dispose();
      }
    });

    this.scene?.clear();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.boardGroup = null;
    this.pieceGroup = null;
    this.highlightGroup = null;

    this.pieceMeshes.clear();
    this.squareMeshes.clear();

    this.initialized = false;
  }
}

/* ---------------------------------------------------------
   FACTORY
--------------------------------------------------------- */

export function createChessScene(options = {}) {
  return new ChessScene(options);
}

/* =========================================================
   FILE 69 COMPLETE
   Path: js/3d/chess-scene.js
   PARTS: 1/2 + 2/2
   ========================================================= */
  
