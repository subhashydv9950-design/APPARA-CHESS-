
import * as THREE from "three";

export const ENVIRONMENT_STYLES = {
  ROYAL_PALACE: {
    id: "royal-palace",
    name: "Royal Palace",
    floor: 0x242033,
    floorAccent: 0x75618d,
    wall: 0x21172f,
    wallAccent: 0x39244d,
    gold: 0xd8ad5c,
    curtain: 0x4a173f,
    pillar: 0xddd4c5,
    light: 0xffd8a0,
    ambient: 0x77708f
  },

  CRYSTAL_HALL: {
    id: "crystal-hall",
    name: "Crystal Hall",
    floor: 0x172b42,
    floorAccent: 0x4b7895,
    wall: 0x10243b,
    wallAccent: 0x294966,
    gold: 0x9bd8ed,
    curtain: 0x183c59,
    pillar: 0xc5e4ef,
    light: 0xc7eaff,
    ambient: 0x647eae
  },

  EMERALD_HALL: {
    id: "emerald-hall",
    name: "Emerald Hall",
    floor: 0x122b26,
    floorAccent: 0x3d6955,
    wall: 0x10251f,
    wallAccent: 0x24483a,
    gold: 0xd5b56c,
    curtain: 0x164b3b,
    pillar: 0xc9c7a9,
    light: 0xffe0a8,
    ambient: 0x687e6b
  },

  MIDNIGHT: {
    id: "midnight",
    name: "Midnight Chamber",
    floor: 0x10121d,
    floorAccent: 0x30394e,
    wall: 0x090c17,
    wallAccent: 0x202a40,
    gold: 0x8799bd,
    curtain: 0x171d34,
    pillar: 0x68758e,
    light: 0xb9d7ff,
    ambient: 0x4a5d83
  }
};

const DEFAULT_OPTIONS = {
  style: "royal-palace",
  width: 30,
  depth: 30,
  wallHeight: 12,
  showWalls: true,
  showPillars: true,
  showCurtains: true,
  showFloorPattern: true,
  showCeiling: false,
  showDecorations: true,
  showLights: true,
  pillarCount: 4,
  floorTiles: 6,
  lightIntensity: 1.6
};

export class EnvironmentFactory {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.root = null;
    this.geometries = new Set();
    this.materials = new Set();
    this.lights = new Set();
    this.disposed = false;

    this.style = this.getStyle(this.options.style);
  }

  getStyle(styleId) {
    if (typeof styleId === "object" && styleId !== null) {
      return styleId;
    }

    return (
      Object.values(ENVIRONMENT_STYLES).find(
        item => item.id === styleId
      ) || ENVIRONMENT_STYLES.ROYAL_PALACE
    );
  }

  trackGeometry(geometry) {
    this.geometries.add(geometry);
    return geometry;
  }

  trackMaterial(material) {
    this.materials.add(material);
    return material;
  }

  createMaterial(color, options = {}) {
    return this.trackMaterial(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.12,
        ...options
      })
    );
  }

  createMesh(
    geometry,
    material,
    name,
    position,
    parent = this.root
  ) {
    const mesh = new THREE.Mesh(
      this.trackGeometry(geometry),
      material
    );

    mesh.name = name;

    mesh.position.set(
      position.x ?? 0,
      position.y ?? 0,
      position.z ?? 0
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);
    return mesh;
  }

  createBox(
    name,
    width,
    height,
    depth,
    material,
    position,
    parent = this.root
  ) {
    return this.createMesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
      name,
      position,
      parent
    );
  }

  createCylinder(
    name,
    radiusTop,
    radiusBottom,
    height,
    material,
    position,
    parent = this.root,
    segments = 24
  ) {
    return this.createMesh(
      new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        segments
      ),
      material,
      name,
      position,
      parent
    );
  }

  createSphere(
    name,
    radius,
    material,
    position,
    parent = this.root
  ) {
    return this.createMesh(
      new THREE.SphereGeometry(radius, 16, 12),
      material,
      name,
      position,
      parent
    );
  }

  createMaterials() {
    const style = this.style;

    return {
      floor: this.createMaterial(style.floor, {
        roughness: 0.28,
        metalness: 0.28
      }),

      floorAccent: this.createMaterial(style.floorAccent, {
        roughness: 0.32,
        metalness: 0.42
      }),

      wall: this.createMaterial(style.wall, {
        roughness: 0.88
      }),

      wallAccent: this.createMaterial(style.wallAccent, {
        roughness: 0.52,
        metalness: 0.22
      }),

      gold: this.createMaterial(style.gold, {
        roughness: 0.24,
        metalness: 0.88
      }),

      curtain: this.createMaterial(style.curtain, {
        roughness: 0.82,
        metalness: 0
      }),

      pillar: this.createMaterial(style.pillar, {
        roughness: 0.3,
        metalness: 0.16
      }),

      dark: this.createMaterial(0x090a12, {
        roughness: 0.5,
        metalness: 0.3
      })
    };
  }

  createFloor(materials) {
    const { width, depth } = this.options;

    this.createBox(
      "Palace_Main_Floor",
      width,
      0.3,
      depth,
      materials.floor,
      {
        x: 0,
        y: -0.32,
        z: 0
      }
    );

    if (!this.options.showFloorPattern) return;

    const count = Math.max(
      2,
      Math.min(10, this.options.floorTiles)
    );

    const tileWidth = width / count;
    const tileDepth = depth / count;

    // Subtle alternating floor panels.
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if ((row + col) % 2 !== 0) continue;

        this.createBox(
          `Floor_Panel_${row}_${col}`,
          tileWidth * 0.92,
          0.018,
          tileDepth * 0.92,
          materials.floorAccent,
          {
            x: -width / 2 + tileWidth * (col + 0.5),
            y: -0.158,
            z: -depth / 2 + tileDepth * (row + 0.5)
          }
        );
      }
    }

    // Gold border around the central floor area.
    const borderWidth = width * 0.66;
    const borderDepth = depth * 0.66;

    this.createBox(
      "Floor_Gold_Border_Front",
      borderWidth,
      0.025,
      0.055,
      materials.gold,
      {
        x: 0,
        y: -0.145,
        z: borderDepth / 2
      }
    );

    this.createBox(
      "Floor_Gold_Border_Back",
      borderWidth,
      0.025,
      0.055,
      materials.gold,
      {
        x: 0,
        y: -0.145,
        z: -borderDepth / 2
      }
    );

    this.createBox(
      "Floor_Gold_Border_Left",
      0.055,
      0.025,
      borderDepth,
      materials.gold,
      {
        x: -borderWidth / 2,
        y: -0.145,
        z: 0
      }
    );

    this.createBox(
      "Floor_Gold_Border_Right",
      0.055,
      0.025,
      borderDepth,
      materials.gold,
      {
        x: borderWidth / 2,
        y: -0.145,
        z: 0
      }
    );
  }

  createWalls(materials) {
    if (!this.options.showWalls) return;

    const { width, depth, wallHeight } = this.options;

    const wallY = wallHeight / 2 - 0.15;

    // Rear wall.
    this.createBox(
      "Palace_Back_Wall",
      width,
      wallHeight,
      0.35,
      materials.wall,
      {
        x: 0,
        y: wallY,
        z: -depth / 2
      }
    );

    // Left wall.
    this.createBox(
      "Palace_Left_Wall",
      0.35,
      wallHeight,
      depth,
      materials.wall,
      {
        x: -width / 2,
        y: wallY,
        z: 0
      }
    );

    // Right wall.
    this.createBox(
      "Palace_Right_Wall",
      0.35,
      wallHeight,
      depth,
      materials.wall,
      {
        x: width / 2,
        y: wallY,
        z: 0
      }
    );

    // Upper wall trim.
    const trimY = wallHeight - 0.35;

    this.createBox(
      "Rear_Wall_Gold_Trim",
      width,
      0.16,
      0.48,
      materials.gold,
      {
        x: 0,
        y: trimY,
        z: -depth / 2
      }
    );

    this.createBox(
      "Left_Wall_Gold_Trim",
      0.48,
      0.16,
      depth,
      materials.gold,
      {
        x: -width / 2,
        y: trimY,
        z: 0
      }
    );

    this.createBox(
      "Right_Wall_Gold_Trim",
      0.48,
      0.16,
      depth,
      materials.gold,
      {
        x: width / 2,
        y: trimY,
        z: 0
      }
    );

    this.createWallPanels(materials);
  }

  createWallPanels(materials) {
    const { width, wallHeight } = this.options;

    const panelCount = 5;
    const panelWidth = width / (panelCount + 1);

    for (let i = 0; i < panelCount; i++) {
      const x = -width / 2 + panelWidth * (i + 1);

      this.createBox(
        `Rear_Wall_Panel_${i + 1}`,
        panelWidth * 0.62,
        wallHeight * 0.62,
        0.08,
        materials.wallAccent,
        {
          x,
          y: wallHeight * 0.48,
          z: -this.options.depth / 2 + 0.2
        }
      );

      this.createBox(
        `Rear_Wall_Panel_Gold_${i + 1}`,
        panelWidth * 0.68,
        0.045,
        0.12,
        materials.gold,
        {
          x,
          y: wallHeight * 0.79,
          z: -this.options.depth / 2 + 0.12
        }
      );
    }
  }

  createPillar(position, materials, index) {
    const { wallHeight } = this.options;

    const group = new THREE.Group();
    group.name = `Royal_Pillar_${index}`;
    group.position.set(position.x, 0, position.z);
    this.root.add(group);

    const baseY = 0.15;
    const shaftHeight = wallHeight * 0.78;
    const shaftY = baseY + shaftHeight / 2;

    this.createBox(
      `Pillar_${index}_Base`,
      1.35,
      0.3,
      1.35,
      materials.gold,
      {
        x: 0,
        y: baseY,
        z: 0
      },
      group
    );

    this.createCylinder(
      `Pillar_${index}_Shaft`,
      0.42,
      0.58,
      shaftHeight,
      materials.pillar,
      {
        x: 0,
        y: shaftY,
        z: 0
      },
      group,
      20
    );

    this.createCylinder(
      `Pillar_${index}_Bottom_Ring`,
      0.63,
      0.63,
      0.18,
      materials.gold,
      {
        x: 0,
        y: 0.55,
        z: 0
      },
      group,
      20
    );

    this.createCylinder(
      `Pillar_${index}_Top_Ring`,
      0.65,
      0.65,
      0.24,
      materials.gold,
      {
        x: 0,
        y: shaftHeight + 0.35,
        z: 0
      },
      group,
      20
    );

    this.createBox(
      `Pillar_${index}_Capital`,
      1.25,
      0.24,
      1.25,
      materials.pillar,
      {
        x: 0,
        y: shaftHeight + 0.58,
        z: 0
      },
      group
    );

    this.createSphere(
      `Pillar_${index}_Top_Jewel`,
      0.14,
      materials.gold,
      {
        x: 0,
        y: shaftHeight + 0.78,
        z: 0
      },
      group
    );

    return group;
  }

  createPillars(materials) {
    if (!this.options.showPillars) return;

    const { width, depth, pillarCount } = this.options;

    const offsetX = width / 2 - 1.2;
    const offsetZ = depth / 2 - 1.2;

    const positions = [
      { x: -offsetX, z: -offsetZ },
      { x: offsetX, z: -offsetZ },
      { x: -offsetX, z: offsetZ },
      { x: offsetX, z: offsetZ }
    ];

    const count = Math.max(
      0,
      Math.min(4, pillarCount)
    );

    positions.slice(0, count).forEach((position, index) => {
      this.createPillar(
        position,
        materials,
        index + 1
      );
    });
  }

  createCurtain(position, materials, index) {
    const { wallHeight } = this.options;

    const group = new THREE.Group();
    group.name = `Palace_Curtain_${index}`;

    group.position.set(
      position.x,
      position.y,
      position.z
    );

    this.root.add(group);

    const curtainHeight = wallHeight * 0.72;

    this.createBox(
      `Curtain_${index}_Fabric`,
      2.4,
      curtainHeight,
      0.22,
      materials.curtain,
      {
        x: 0,
        y: curtainHeight / 2,
        z: 0
      },
      group
    );

    // Decorative curtain folds.
    for (let i = 0; i < 5; i++) {
      this.createBox(
        `Curtain_${index}_Fold_${i}`,
        0.035,
        curtainHeight * 0.94,
        0.25,
        materials.wallAccent,
        {
          x: -0.85 + i * 0.42,
          y: curtainHeight / 2,
          z: 0.13
        },
        group
      );
    }

    // Curtain top rod.
    this.createCylinder(
      `Curtain_${index}_Rod`,
      0.09,
      0.09,
      2.7,
      materials.gold,
      {
        x: 0,
        y: curtainHeight + 0.18,
        z: 0
      },
      group,
      16
    );

    // Gold curtain tie.
    this.createBox(
      `Curtain_${index}_Tie`,
      2.48,
      0.13,
      0.28,
      materials.gold,
      {
        x: 0,
        y: curtainHeight * 0.42,
        z: 0.15
      },
      group
    );

    return group;
  }

  createCurtains(materials) {
    if (!this.options.showCurtains) return;

    const { depth } = this.options;

    this.createCurtain(
      {
        x: -4.5,
        y: 0,
        z: -depth / 2 + 0.45
      },
      materials,
      1
    );

    this.createCurtain(
      {
        x: 4.5,
        y: 0,
        z: -depth / 2 + 0.45
      },
      materials,
      2
    );
  }

  createDecorations(materials) {
    if (!this.options.showDecorations) return;

    const { wallHeight, width } = this.options;

    // Central royal wall emblem.
    const emblemGroup = new THREE.Group();
    emblemGroup.name = "Royal_Wall_Emblem";
    emblemGroup.position.set(
      0,
      wallHeight * 0.69,
      -this.options.depth / 2 + 0.05
    );

    this.root.add(emblemGroup);

    this.createCylinder(
      "Royal_Emblem_Outer",
      1.05,
      1.05,
      0.12,
      materials.gold,
      {
        x: 0,
        y: 0,
        z: 0
      },
      emblemGroup,
      48
    );

    this.createCylinder(
      "Royal_Emblem_Inner",
      0.82,
      0.82,
      0.15,
      materials.wallAccent,
      {
        x: 0,
        y: 0,
        z: 0.08
      },
      emblemGroup,
      48
    );

    this.createSphere(
      "Royal_Emblem_Center",
      0.34,
      materials.gold,
      {
        x: 0,
        y: 0,
        z: 0.2
      },
      emblemGroup
    );

    // Side wall decorative strips.
    [-1, 1].forEach(side => {
      this.createBox(
        `Side_Wall_Decoration_${side}`,
        0.08,
        wallHeight * 0.56,
        0.12,
        materials.gold,
        {
          x: side * (width / 2 - 0.28),
          y: wallHeight * 0.46,
          z: 0
        }
      );
    });
  }

  createCeiling(materials) {
    if (!this.options.showCeiling) return;

    const { width, depth, wallHeight } = this.options;

    this.createBox(
      "Palace_Ceiling",
      width,
      0.35,
      depth,
      materials.wall,
      {
        x: 0,
        y: wallHeight,
        z: 0
      }
    );

    this.createBox(
      "Ceiling_Gold_Border",
      width * 0.82,
      0.055,
      depth * 0.82,
      materials.gold,
      {
        x: 0,
        y: wallHeight - 0.18,
        z: 0
      }
    );
  }

  addLight(light, name) {
    light.name = name;
    this.root.add(light);
    this.lights.add(light);
    return light;
  }

  createLighting() {
    if (!this.options.showLights) return;

    const style = this.style;
    const intensity = this.options.lightIntensity;

    const ambient = new THREE.AmbientLight(
      style.ambient,
      0.65 * intensity
    );

    this.addLight(ambient, "Palace_Ambient_Light");

    const main = new THREE.DirectionalLight(
      0xffffff,
      2.1 * intensity
    );

    main.position.set(7, 12, 8);
    main.castShadow = true;
    main.shadow.mapSize.set(1024, 1024);
    main.shadow.camera.left = -18;
    main.shadow.camera.right = 18;
    main.shadow.camera.top = 18;
    main.shadow.camera.bottom = -18;

    this.addLight(main, "Palace_Main_Directional_Light");

    const rear = new THREE.PointLight(
      style.light,
      95 * intensity,
      30,
      2
    );

    rear.position.set(0, 7, -8);
    this.addLight(rear, "Palace_Rear_Glow");

    const left = new THREE.PointLight(
      style.light,
      55 * intensity,
      20,
      2
    );

    left.position.set(-9, 5, 1);
    this.addLight(left, "Palace_Left_Light");

    const right = new THREE.PointLight(
      style.light,
      55 * intensity,
      20,
      2
    );

    right.position.set(9, 5, 1);
    this.addLight(right, "Palace_Right_Light");
  }

  createEnvironment(options = {}) {
    if (this.disposed) {
      throw new Error(
        "EnvironmentFactory has already been disposed."
      );
    }

    if (this.root) {
      this.disposeEnvironment();
    }

    this.options = {
      ...this.options,
      ...options
    };

    this.style = this.getStyle(this.options.style);

    this.root = new THREE.Group();
    this.root.name = "APPARA_CHESS_ROYAL_ENVIRONMENT";

    const materials = this.createMaterials();

    this.createFloor(materials);
    this.createWalls(materials);
    this.createPillars(materials);
    this.createCurtains(materials);
    this.createDecorations(materials);
    this.createCeiling(materials);
    this.createLighting();

    this.root.userData = {
      type: "chess-environment",
      style: this.style.id,
      width: this.options.width,
      depth: this.options.depth,
      wallHeight: this.options.wallHeight
    };

    return this.root;
  }

  setStyle(styleId) {
    const nextStyle = this.getStyle(styleId);

    if (this.root) {
      this.disposeEnvironment();
    }

    this.style = nextStyle;
    this.options.style = nextStyle.id;

    return this.createEnvironment();
  }

  disposeEnvironment() {
    if (this.root) {
      this.root.removeFromParent();
      this.root = null;
    }

    this.geometries.forEach(geometry => {
      geometry.dispose();
    });

    this.materials.forEach(material => {
      material.dispose();
    });

    this.geometries.clear();
    this.materials.clear();
    this.lights.clear();
  }

  dispose() {
    if (this.disposed) return;

    this.disposeEnvironment();
    this.disposed = true;
  }
}

export function createEnvironmentFactory(options = {}) {
  return new EnvironmentFactory(options);
}

// FILE 30 END — environment-factory.js
        
