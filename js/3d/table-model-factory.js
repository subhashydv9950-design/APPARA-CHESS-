
import * as THREE from "three";

export const TABLE_STYLES = {
  ROYAL_GOLD: {
    id: "royal-gold",
    name: "Royal Gold",
    top: 0x21142f,
    edge: 0x100b19,
    metal: 0xd9ad55,
    accent: 0xffd98a,
    leg: 0x171020,
    foot: 0xc69a48,
    pattern: "royal"
  },

  OBSIDIAN: {
    id: "obsidian",
    name: "Obsidian Black",
    top: 0x10131c,
    edge: 0x080a10,
    metal: 0x8d9bab,
    accent: 0xc7d7e8,
    leg: 0x111722,
    foot: 0x68798d,
    pattern: "minimal"
  },

  CRYSTAL: {
    id: "crystal",
    name: "Crystal Palace",
    top: 0x253d59,
    edge: 0x13253a,
    metal: 0x91c9e8,
    accent: 0xd8f4ff,
    leg: 0x1b3048,
    foot: 0x9bcde5,
    pattern: "crystal"
  },

  EMERALD: {
    id: "emerald",
    name: "Emerald Court",
    top: 0x123b32,
    edge: 0x09251f,
    metal: 0xc8a85b,
    accent: 0xf4d98a,
    leg: 0x102b25,
    foot: 0xb18d46,
    pattern: "royal"
  },

  MARBLE: {
    id: "marble",
    name: "White Marble",
    top: 0xd8d7d1,
    edge: 0x777b85,
    metal: 0xc5a45b,
    accent: 0xf7e7bb,
    leg: 0x454b58,
    foot: 0xc2a56c,
    pattern: "marble"
  }
};

const DEFAULT_OPTIONS = {
  width: 10.4,
  depth: 10.4,
  topThickness: 0.42,
  topY: 0,
  legHeight: 3.1,
  legWidth: 0.48,
  borderWidth: 0.12,
  style: "royal-gold",
  ornaments: true,
  crossBraces: true,
  decorativeCorners: true
};

export class TableModelFactory {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.root = null;
    this.geometries = new Set();
    this.materials = new Set();
    this.disposed = false;

    this.style = this.getStyle(this.options.style);
  }

  getStyle(styleId) {
    if (typeof styleId === "object" && styleId !== null) {
      return styleId;
    }

    return (
      Object.values(TABLE_STYLES).find(
        style => style.id === styleId
      ) || TABLE_STYLES.ROYAL_GOLD
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

  createStandardMaterial(color, options = {}) {
    return this.trackMaterial(
      new THREE.MeshStandardMaterial({
        color,
        metalness: options.metalness ?? 0.25,
        roughness: options.roughness ?? 0.55,
        envMapIntensity: options.envMapIntensity ?? 1,
        ...options
      })
    );
  }

  createMetalMaterial(color, options = {}) {
    return this.createStandardMaterial(color, {
      metalness: 0.88,
      roughness: 0.24,
      ...options
    });
  }

  createMesh(geometry, material, name, parent = this.root) {
    const mesh = new THREE.Mesh(
      this.trackGeometry(geometry),
      material
    );

    mesh.name = name;
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
    parent = this.root,
    bevel = false
  ) {
    let geometry;

    if (bevel) {
      geometry = new THREE.BoxGeometry(
        width,
        height,
        depth,
        2,
        2,
        2
      );
    } else {
      geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
      );
    }

    const mesh = this.createMesh(
      geometry,
      material,
      name,
      parent
    );

    mesh.position.set(
      position.x,
      position.y,
      position.z
    );

    return mesh;
  }

  createCylinder(
    name,
    radiusTop,
    radiusBottom,
    height,
    material,
    position,
    parent = this.root,
    radialSegments = 12
  ) {
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments
    );

    const mesh = this.createMesh(
      geometry,
      material,
      name,
      parent
    );

    mesh.position.set(
      position.x,
      position.y,
      position.z
    );

    return mesh;
  }

  createSphere(
    name,
    radius,
    material,
    position,
    parent = this.root
  ) {
    const geometry = new THREE.SphereGeometry(
      radius,
      16,
      12
    );

    const mesh = this.createMesh(
      geometry,
      material,
      name,
      parent
    );

    mesh.position.set(
      position.x,
      position.y,
      position.z
    );

    return mesh;
  }

  createMaterials() {
    const style = this.style;

    return {
      top: this.createStandardMaterial(style.top, {
        metalness: 0.22,
        roughness: 0.28
      }),

      edge: this.createStandardMaterial(style.edge, {
        metalness: 0.38,
        roughness: 0.32
      }),

      metal: this.createMetalMaterial(style.metal),

      accent: this.createMetalMaterial(style.accent, {
        metalness: 0.94,
        roughness: 0.17
      }),

      legs: this.createStandardMaterial(style.leg, {
        metalness: 0.3,
        roughness: 0.38
      }),

      feet: this.createMetalMaterial(style.foot, {
        metalness: 0.82,
        roughness: 0.3
      }),

      darkDetail: this.createStandardMaterial(0x080910, {
        metalness: 0.45,
        roughness: 0.3
      })
    };
  }

  createTabletop(materials) {
    const {
      width,
      depth,
      topThickness,
      topY,
      borderWidth
    } = this.options;

    const halfW = width / 2;
    const halfD = depth / 2;
    const centerY = topY - topThickness / 2;

    this.createBox(
      "Tabletop_Main_Surface",
      width,
      topThickness,
      depth,
      materials.top,
      { x: 0, y: centerY, z: 0 },
      this.root,
      true
    );

    // Lower dark supporting layer.
    this.createBox(
      "Tabletop_Lower_Edge",
      width + 0.12,
      0.13,
      depth + 0.12,
      materials.edge,
      {
        x: 0,
        y: topY - topThickness + 0.015,
        z: 0
      }
    );

    const goldY = topY - 0.075;

    // Front and rear metal inlays.
    this.createBox(
      "Gold_Inlay_Front",
      width - 0.24,
      0.045,
      borderWidth,
      materials.metal,
      {
        x: 0,
        y: goldY,
        z: halfD - borderWidth / 2
      }
    );

    this.createBox(
      "Gold_Inlay_Back",
      width - 0.24,
      0.045,
      borderWidth,
      materials.metal,
      {
        x: 0,
        y: goldY,
        z: -halfD + borderWidth / 2
      }
    );

    // Left and right metal inlays.
    this.createBox(
      "Gold_Inlay_Left",
      borderWidth,
      0.045,
      depth - 0.24,
      materials.metal,
      {
        x: -halfW + borderWidth / 2,
        y: goldY,
        z: 0
      }
    );

    this.createBox(
      "Gold_Inlay_Right",
      borderWidth,
      0.045,
      depth - 0.24,
      materials.metal,
      {
        x: halfW - borderWidth / 2,
        y: goldY,
        z: 0
      }
    );

    // Outer polished metal rim.
    this.createBox(
      "Outer_Rim_Front",
      width + 0.08,
      0.065,
      0.075,
      materials.accent,
      {
        x: 0,
        y: topY - 0.025,
        z: halfD + 0.015
      }
    );

    this.createBox(
      "Outer_Rim_Back",
      width + 0.08,
      0.065,
      0.075,
      materials.accent,
      {
        x: 0,
        y: topY - 0.025,
        z: -halfD - 0.015
      }
    );

    this.createBox(
      "Outer_Rim_Left",
      0.075,
      0.065,
      depth + 0.08,
      materials.accent,
      {
        x: -halfW - 0.015,
        y: topY - 0.025,
        z: 0
      }
    );

    this.createBox(
      "Outer_Rim_Right",
      0.075,
      0.065,
      depth + 0.08,
      materials.accent,
      {
        x: halfW + 0.015,
        y: topY - 0.025,
        z: 0
      }
    );
  }

  createLegs(materials) {
    const {
      width,
      depth,
      topY,
      topThickness,
      legHeight,
      legWidth
    } = this.options;

    const x = width / 2 - 0.85;
    const z = depth / 2 - 0.85;

    const bottomY = topY - topThickness - legHeight;
    const centerY = (topY - topThickness + bottomY) / 2;

    const positions = [
      { x: -x, z: -z, name: "Back_Left" },
      { x: x, z: -z, name: "Back_Right" },
      { x: -x, z: z, name: "Front_Left" },
      { x: x, z: z, name: "Front_Right" }
    ];

    positions.forEach(position => {
      const legGroup = new THREE.Group();
      legGroup.name = `Table_Leg_${position.name}`;

      legGroup.position.set(
        position.x,
        0,
        position.z
      );

      this.root.add(legGroup);

      // Main tapered leg.
      this.createCylinder(
        `${position.name}_Main_Leg`,
        legWidth * 0.48,
        legWidth * 0.8,
        legHeight,
        materials.legs,
        {
          x: 0,
          y: centerY,
          z: 0
        },
        legGroup,
        8
      );

      // Upper decorative collar.
      this.createCylinder(
        `${position.name}_Upper_Collar`,
        legWidth * 0.72,
        legWidth * 0.72,
        0.15,
        materials.metal,
        {
          x: 0,
          y: topY - topThickness - 0.12,
          z: 0
        },
        legGroup,
        12
      );

      // Lower decorative collar.
      this.createCylinder(
        `${position.name}_Lower_Collar`,
        legWidth * 0.65,
        legWidth * 0.65,
        0.12,
        materials.accent,
        {
          x: 0,
          y: bottomY + 0.28,
          z: 0
        },
        legGroup,
        12
      );

      // Wide foot.
      this.createCylinder(
        `${position.name}_Foot`,
        legWidth * 1.05,
        legWidth * 1.28,
        0.22,
        materials.feet,
        {
          x: 0,
          y: bottomY + 0.08,
          z: 0
        },
        legGroup,
        12
      );

      // Decorative foot cap.
      this.createSphere(
        `${position.name}_Foot_Cap`,
        legWidth * 0.28,
        materials.accent,
        {
          x: 0,
          y: bottomY - 0.015,
          z: 0
        },
        legGroup
      );

      if (this.options.ornaments) {
        this.createCylinder(
          `${position.name}_Leg_Ornament`,
          legWidth * 0.42,
          legWidth * 0.55,
          0.38,
          materials.metal,
          {
            x: 0,
            y: centerY,
            z: 0
          },
          legGroup,
          8
        );
      }
    });
  }

  createCrossBraces(materials) {
    if (!this.options.crossBraces) return;

    const {
      width,
      depth,
      topY,
      topThickness,
      legHeight
    } = this.options;

    const x = width / 2 - 0.85;
    const z = depth / 2 - 0.85;

    const y = topY - topThickness - legHeight * 0.58;

    const braceMaterial = materials.metal;

    // Long front-to-back support beams.
    [-x, x].forEach((px, index) => {
      this.createBox(
        `Side_Cross_Brace_${index}`,
        0.16,
        0.18,
        depth - 1.7,
        braceMaterial,
        {
          x: px,
          y,
          z: 0
        }
      );
    });

    // Left-to-right support beams.
    [-z, z].forEach((pz, index) => {
      this.createBox(
        `End_Cross_Brace_${index}`,
        width - 1.7,
        0.18,
        0.16,
        braceMaterial,
        {
          x: 0,
          y,
          z: pz
        }
      );
    });

    // Central support ornament.
    this.createSphere(
      "Central_Brace_Jewel",
      0.16,
      materials.accent,
      {
        x: 0,
        y,
        z: 0
      }
    );
  }

  createCornerDecorations(materials) {
    if (!this.options.decorativeCorners) return;

    const {
      width,
      depth,
      topY
    } = this.options;

    const x = width / 2 - 0.35;
    const z = depth / 2 - 0.35;

    const corners = [
      { x: -x, z: -z },
      { x: x, z: -z },
      { x: -x, z: z },
      { x: x, z: z }
    ];

    corners.forEach((corner, index) => {
      this.createSphere(
        `Corner_Jewel_${index + 1}`,
        0.11,
        materials.accent,
        {
          x: corner.x,
          y: topY + 0.012,
          z: corner.z
        }
      );

      this.createCylinder(
        `Corner_Jewel_Base_${index + 1}`,
        0.17,
        0.17,
        0.045,
        materials.metal,
        {
          x: corner.x,
          y: topY - 0.005,
          z: corner.z
        }
      );
    });
  }

  createRoyalOrnaments(materials) {
    if (!this.options.ornaments) return;

    if (
      this.style.pattern !== "royal" &&
      this.style.pattern !== "crystal"
    ) {
      return;
    }

    const {
      width,
      topY
    } = this.options;

    const positions = [-width * 0.28, 0, width * 0.28];

    positions.forEach((x, index) => {
      this.createBox(
        `Front_Ornament_Base_${index}`,
        0.48,
        0.035,
        0.08,
        materials.metal,
        {
          x,
          y: topY + 0.012,
          z: this.options.depth / 2 - 0.18
        }
      );

      this.createSphere(
        `Front_Ornament_Gem_${index}`,
        0.055,
        materials.accent,
        {
          x,
          y: topY + 0.06,
          z: this.options.depth / 2 - 0.18
        }
      );
    });
  }

  createTable(options = {}) {
    if (this.disposed) {
      throw new Error(
        "TableModelFactory has already been disposed."
      );
    }

    if (this.root) {
      this.disposeTable();
    }

    this.options = {
      ...this.options,
      ...options
    };

    this.style = this.getStyle(this.options.style);

    this.root = new THREE.Group();
    this.root.name = "APPARA_CHESS_LUXURY_TABLE";

    const materials = this.createMaterials();

    this.createTabletop(materials);
    this.createLegs(materials);
    this.createCrossBraces(materials);
    this.createCornerDecorations(materials);
    this.createRoyalOrnaments(materials);

    this.root.userData = {
      type: "chess-table",
      style: this.style.id,
      width: this.options.width,
      depth: this.options.depth,
      topY: this.options.topY
    };

    return this.root;
  }

  setStyle(styleId) {
    const nextStyle = this.getStyle(styleId);

    if (this.root) {
      this.disposeTable();
    }

    this.style = nextStyle;
    this.options.style = nextStyle.id;

    return this.createTable();
  }

  disposeTable() {
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
  }

  dispose() {
    if (this.disposed) return;

    this.disposeTable();
    this.disposed = true;
  }
}

export function createTableModelFactory(options = {}) {
  return new TableModelFactory(options);
}

// FILE 29 END — table-model-factory.js
      
