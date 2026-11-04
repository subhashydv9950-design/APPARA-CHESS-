
/* =========================================
   APPARA CHESS
   FILE: config/board-catalog.js
   SECTION: CONFIG

   12 Board Collections
   7 Visual Upgrade Levels
========================================= */

export const BOARD_COLLECTIONS = Object.freeze([

  {
    id: "classic-heritage",
    name: "Classic Heritage",
    rarity: "Common",
    theme: "Traditional Royal",
    materials: {
      lightSquare: "ivory-marble",
      darkSquare: "dark-walnut",
      border: "polished-wood",
      metal: "antique-brass"
    },
    geometry: {
      borderStyle: "classic-layered",
      cornerStyle: "carved-corners",
      edgeStyle: "wooden-frame"
    },
    decoration: [
      "heritage-engraving",
      "traditional-border",
      "classic-corner-pattern"
    ],
    lighting: "warm-classic"
  },

  {
    id: "royal-gold",
    name: "Royal Gold",
    rarity: "Rare",
    theme: "Golden Dynasty",
    materials: {
      lightSquare: "cream-marble",
      darkSquare: "black-marble",
      border: "royal-gold",
      metal: "polished-gold"
    },
    geometry: {
      borderStyle: "imperial-gold-frame",
      cornerStyle: "golden-royal-corners",
      edgeStyle: "engraved-metal-frame"
    },
    decoration: [
      "royal-crown-engraving",
      "golden-inlays",
      "imperial-emblem"
    ],
    lighting: "golden-palace"
  },

  {
    id: "purple-kingdom",
    name: "Purple Kingdom",
    rarity: "Epic",
    theme: "Amethyst Palace",
    materials: {
      lightSquare: "lavender-marble",
      darkSquare: "royal-purple-marble",
      border: "purple-crystal",
      metal: "violet-chrome"
    },
    geometry: {
      borderStyle: "crystal-layered-frame",
      cornerStyle: "amethyst-corners",
      edgeStyle: "faceted-purple-frame"
    },
    decoration: [
      "amethyst-engraving",
      "purple-gem-inlays",
      "royal-symbols"
    ],
    lighting: "purple-crystal"
  },

  {
    id: "white-marble",
    name: "White Marble",
    rarity: "Rare",
    theme: "Marble Empire",
    materials: {
      lightSquare: "white-carrara-marble",
      darkSquare: "grey-marble",
      border: "white-polished-marble",
      metal: "silver"
    },
    geometry: {
      borderStyle: "marble-sculpted-frame",
      cornerStyle: "marble-carved-corners",
      edgeStyle: "smooth-stone-frame"
    },
    decoration: [
      "marble-veins",
      "silver-lines",
      "classical-patterns"
    ],
    lighting: "soft-white"
  },

  {
    id: "black-diamond",
    name: "Black Diamond",
    rarity: "Epic",
    theme: "Obsidian Palace",
    materials: {
      lightSquare: "smoked-glass",
      darkSquare: "black-obsidian",
      border: "black-diamond",
      metal: "dark-chrome"
    },
    geometry: {
      borderStyle: "angular-diamond-frame",
      cornerStyle: "diamond-cut-corners",
      edgeStyle: "obsidian-edge"
    },
    decoration: [
      "diamond-facets",
      "black-metal-inlays",
      "dark-royal-engraving"
    ],
    lighting: "dark-luxury"
  },

  {
    id: "dark-walnut",
    name: "Dark Walnut",
    rarity: "Common",
    theme: "Heritage Wood",
    materials: {
      lightSquare: "light-walnut",
      darkSquare: "dark-walnut",
      border: "solid-walnut",
      metal: "bronze"
    },
    geometry: {
      borderStyle: "handcrafted-wood-frame",
      cornerStyle: "wooden-carved-corners",
      edgeStyle: "layered-wood"
    },
    decoration: [
      "natural-wood-grain",
      "hand-carved-patterns",
      "bronze-inlays"
    ],
    lighting: "warm-wood"
  },

  {
    id: "crystal-glass",
    name: "Crystal Glass",
    rarity: "Legendary",
    theme: "Crystal Palace",
    materials: {
      lightSquare: "clear-crystal",
      darkSquare: "smoked-crystal",
      border: "transparent-crystal",
      metal: "platinum"
    },
    geometry: {
      borderStyle: "multi-layer-crystal",
      cornerStyle: "cut-crystal-corners",
      edgeStyle: "transparent-glass-frame"
    },
    decoration: [
      "crystal-facets",
      "refractive-panels",
      "floating-light-lines"
    ],
    lighting: "refractive-crystal"
  },

  {
    id: "ice-kingdom",
    name: "Ice Kingdom",
    rarity: "Legendary",
    theme: "Frozen Dynasty",
    materials: {
      lightSquare: "frosted-ice",
      darkSquare: "deep-blue-ice",
      border: "frozen-crystal",
      metal: "ice-silver"
    },
    geometry: {
      borderStyle: "frozen-layer-frame",
      cornerStyle: "ice-spike-corners",
      edgeStyle: "glacier-frame"
    },
    decoration: [
      "snowflake-engraving",
      "frozen-cracks",
      "ice-crystal-inlays"
    ],
    lighting: "frozen-blue"
  },

  {
    id: "fire-kingdom",
    name: "Fire Kingdom",
    rarity: "Legendary",
    theme: "Inferno Empire",
    materials: {
      lightSquare: "molten-gold-stone",
      darkSquare: "volcanic-obsidian",
      border: "molten-metal",
      metal: "copper"
    },
    geometry: {
      borderStyle: "volcanic-frame",
      cornerStyle: "flame-carved-corners",
      edgeStyle: "molten-edge"
    },
    decoration: [
      "molten-veins",
      "ember-inlays",
      "inferno-engraving"
    ],
    lighting: "ember-glow"
  },

  {
    id: "emerald-palace",
    name: "Emerald Palace",
    rarity: "Legendary",
    theme: "Emerald Dynasty",
    materials: {
      lightSquare: "jade-marble",
      darkSquare: "deep-emerald",
      border: "emerald-crystal",
      metal: "green-gold"
    },
    geometry: {
      borderStyle: "jade-imperial-frame",
      cornerStyle: "emerald-carved-corners",
      edgeStyle: "layered-jade-frame"
    },
    decoration: [
      "dragon-engraving",
      "jade-inlays",
      "emerald-emblems"
    ],
    lighting: "emerald-palace"
  },

  {
    id: "cyber-arena",
    name: "Cyber Arena",
    rarity: "Legendary",
    theme: "Futuristic Arena",
    materials: {
      lightSquare: "holographic-glass",
      darkSquare: "dark-metal",
      border: "futuristic-alloy",
      metal: "neon-chrome"
    },
    geometry: {
      borderStyle: "mechanical-frame",
      cornerStyle: "cyber-angular-corners",
      edgeStyle: "neon-panel-frame"
    },
    decoration: [
      "circuit-patterns",
      "energy-lines",
      "holographic-panels"
    ],
    lighting: "cyber-neon"
  },

  {
    id: "legendary-dynasty",
    name: "Legendary Dynasty",
    rarity: "Mythic",
    theme: "Supreme Royal Empire",
    materials: {
      lightSquare: "celestial-white-marble",
      darkSquare: "royal-black-crystal",
      border: "mythic-gold-crystal",
      metal: "imperial-gold"
    },
    geometry: {
      borderStyle: "supreme-imperial-frame",
      cornerStyle: "royal-sculpted-corners",
      edgeStyle: "multi-layer-legendary-frame"
    },
    decoration: [
      "imperial-crown-engraving",
      "floating-gem-inlays",
      "celestial-patterns",
      "mythic-royal-emblem"
    ],
    lighting: "celestial-royal"
  }

]);

export const BOARD_UPGRADE_LEVELS = Object.freeze([

  {
    level: 1,
    title: "Basic",
    geometry: [
      "simple-square-edges",
      "basic-board-frame"
    ],
    effects: [],
    detailScale: 1
  },

  {
    level: 2,
    title: "Refined",
    geometry: [
      "bevelled-square-edges",
      "decorative-border"
    ],
    effects: [
      "soft-reflection"
    ],
    detailScale: 1.15
  },

  {
    level: 3,
    title: "Royal",
    geometry: [
      "engraved-square-borders",
      "decorated-corners",
      "layered-frame"
    ],
    effects: [
      "surface-reflection"
    ],
    detailScale: 1.3
  },

  {
    level: 4,
    title: "Imperial",
    geometry: [
      "raised-border-details",
      "metal-inlays",
      "sculpted-corners"
    ],
    effects: [
      "metallic-reflection",
      "premium-lighting"
    ],
    detailScale: 1.5
  },

  {
    level: 5,
    title: "Mythic",
    geometry: [
      "complex-border-sculpture",
      "crystal-inlays",
      "ornamental-corners"
    ],
    effects: [
      "ambient-glow",
      "subtle-particles"
    ],
    detailScale: 1.75
  },

  {
    level: 6,
    title: "Legendary",
    geometry: [
      "floating-frame-elements",
      "multi-layer-border",
      "signature-corners"
    ],
    effects: [
      "animated-reflections",
      "light-trails"
    ],
    detailScale: 2
  },

  {
    level: 7,
    title: "Supreme",
    geometry: [
      "unique-imperial-frame",
      "floating-crystal-elements",
      "advanced-corner-sculpture",
      "signature-board-details"
    ],
    effects: [
      "cinematic-lighting",
      "premium-particles",
      "animated-crystal-reflections"
    ],
    detailScale: 2.4
  }

]);

export const BOARD_MODEL_SETTINGS = Object.freeze({

  files: 8,
  ranks: 8,
  totalSquares: 64,

  defaultCollection: "classic-heritage",
  defaultUpgradeLevel: 1,

  upgradeLevels: 7,

  allowCollectionMixing: true,
  previewBeforePurchase: true,

  coordinates: {
    enabled: true,
    style: "luxury-metal",
    defaultVisible: true
  },

  squareDetails: {
    uniqueMaterials: true,
    bevelledEdges: true,
    castShadows: true,
    receiveShadows: true
  },

  effects: {
    selectionGlow: true,
    legalMoveGlow: true,
    lastMoveHighlight: true,
    captureEffect: true,
    checkEffect: true
  },

  performance: {
    mobileTextureQuality: "high",
    desktopTextureQuality: "ultra",
    useLOD: true,
    useInstancing: true,
    limitRealtimeReflections: true
  }

});

/* =========================================
   FILE END: config/board-catalog.js
========================================= */
    
