
/* =========================================
   APPARA CHESS
   FILE: config/piece-catalog.js
   SECTION: CONFIG

   10 Collections
   6 Unique Piece Types
   7 Visual Upgrade Levels
========================================= */

export const PIECE_TYPES = Object.freeze([
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "pawn"
]);

export const PIECE_COLLECTIONS = Object.freeze([

  {
    id: "classic-heritage",
    name: "Classic Heritage",
    theme: "Traditional Royal",
    rarity: "Common",
    palette: {
      white: "#F2E4C8",
      black: "#34251E",
      metal: "#B68A48",
      accent: "#D6B77A"
    },
    material: "polished-wood",
    motif: "heritage-carving",
    pieces: {
      king: {
        geometry: "royal-crown-king",
        details: ["tall-crown", "cross-top", "layered-base"]
      },
      queen: {
        geometry: "royal-tiara-queen",
        details: ["open-crown", "flower-engraving", "slim-neck"]
      },
      rook: {
        geometry: "fortress-rook",
        details: ["castle-towers", "square-crenellations", "thick-base"]
      },
      bishop: {
        geometry: "classic-mitre-bishop",
        details: ["mitre-cut", "diagonal-groove", "rounded-head"]
      },
      knight: {
        geometry: "sculpted-horse-knight",
        details: ["horse-head", "curved-neck", "mane-carving"]
      },
      pawn: {
        geometry: "classic-orb-pawn",
        details: ["round-head", "slim-body", "tiered-base"]
      }
    }
  },

  {
    id: "royal-gold",
    name: "Royal Gold",
    theme: "Golden Dynasty",
    rarity: "Rare",
    palette: {
      white: "#FFF0C2",
      black: "#4B2D16",
      metal: "#FFD36B",
      accent: "#FFF2A8"
    },
    material: "gold-plated-metal",
    motif: "royal-engraving",
    pieces: {
      king: {
        geometry: "imperial-crown-king",
        details: ["multi-point-crown", "royal-gem", "engraved-mantle"]
      },
      queen: {
        geometry: "imperial-tiara-queen",
        details: ["radiant-tiara", "gem-setting", "ornamental-neck"]
      },
      rook: {
        geometry: "golden-palace-rook",
        details: ["palace-turrets", "golden-columns", "royal-crest"]
      },
      bishop: {
        geometry: "golden-mitre-bishop",
        details: ["golden-mitre", "diamond-cut", "ornamental-band"]
      },
      knight: {
        geometry: "golden-warhorse-knight",
        details: ["armoured-horse", "flowing-mane", "royal-medallion"]
      },
      pawn: {
        geometry: "golden-royal-pawn",
        details: ["golden-orb", "ornamental-collar", "engraved-base"]
      }
    }
  },

  {
    id: "platinum-silver",
    name: "Platinum Silver",
    theme: "Silver Empire",
    rarity: "Rare",
    palette: {
      white: "#FFFFFF",
      black: "#303746",
      metal: "#DCE5F2",
      accent: "#8FC7FF"
    },
    material: "platinum",
    motif: "precision-metalwork",
    pieces: {
      king: {
        geometry: "platinum-emperor-king",
        details: ["angular-crown", "crystal-core", "layered-armour"]
      },
      queen: {
        geometry: "platinum-empress-queen",
        details: ["silver-halo", "crystal-tiara", "faceted-neck"]
      },
      rook: {
        geometry: "platinum-citadel-rook",
        details: ["armoured-towers", "metal-panels", "crystal-corners"]
      },
      bishop: {
        geometry: "platinum-crystal-bishop",
        details: ["crystal-mitre", "faceted-body", "silver-ring"]
      },
      knight: {
        geometry: "platinum-armoured-knight",
        details: ["sculpted-horse", "metallic-mane", "armour-plates"]
      },
      pawn: {
        geometry: "platinum-sphere-pawn",
        details: ["faceted-orb", "metal-neck", "precision-base"]
      }
    }
  },

  {
    id: "purple-crystal",
    name: "Purple Crystal",
    theme: "Amethyst Kingdom",
    rarity: "Epic",
    palette: {
      white: "#E8D8FF",
      black: "#241039",
      metal: "#A66BFF",
      accent: "#E4A8FF"
    },
    material: "amethyst-crystal",
    motif: "crystal-facets",
    pieces: {
      king: {
        geometry: "amethyst-crystal-king",
        details: ["crystal-crown", "floating-gem", "faceted-robe"]
      },
      queen: {
        geometry: "amethyst-crystal-queen",
        details: ["crystal-tiara", "radiant-gem", "crystal-skirt"]
      },
      rook: {
        geometry: "amethyst-crystal-rook",
        details: ["crystal-turrets", "faceted-walls", "glowing-core"]
      },
      bishop: {
        geometry: "amethyst-crystal-bishop",
        details: ["crystal-mitre", "split-facets", "glowing-staff"]
      },
      knight: {
        geometry: "amethyst-crystal-knight",
        details: ["crystal-horse", "faceted-mane", "gem-eyes"]
      },
      pawn: {
        geometry: "amethyst-crystal-pawn",
        details: ["crystal-orb", "transparent-body", "glowing-base"]
      }
    }
  },

  {
    id: "black-diamond",
    name: "Black Diamond",
    theme: "Obsidian Palace",
    rarity: "Epic",
    palette: {
      white: "#E8E8F0",
      black: "#090A12",
      metal: "#777C91",
      accent: "#B5A4FF"
    },
    material: "black-diamond",
    motif: "obsidian-facets",
    pieces: {
      king: {
        geometry: "obsidian-overlord-king",
        details: ["spiked-crown", "diamond-core", "armoured-base"]
      },
      queen: {
        geometry: "obsidian-empress-queen",
        details: ["dark-halo", "diamond-tiara", "sharp-shoulders"]
      },
      rook: {
        geometry: "obsidian-fortress-rook",
        details: ["black-turrets", "reinforced-walls", "diamond-edges"]
      },
      bishop: {
        geometry: "obsidian-priest-bishop",
        details: ["dark-mitre", "sharp-facets", "obsidian-staff"]
      },
      knight: {
        geometry: "obsidian-shadow-knight",
        details: ["armoured-horse", "blade-mane", "dark-crest"]
      },
      pawn: {
        geometry: "obsidian-shadow-pawn",
        details: ["black-diamond-orb", "angular-body", "dark-base"]
      }
    }
  },

  {
    id: "ice-kingdom",
    name: "Ice Kingdom",
    theme: "Frozen Dynasty",
    rarity: "Epic",
    palette: {
      white: "#F2FCFF",
      black: "#173D5C",
      metal: "#9DEBFF",
      accent: "#FFFFFF"
    },
    material: "frosted-ice",
    motif: "ice-crystals",
    pieces: {
      king: {
        geometry: "frost-emperor-king",
        details: ["ice-crown", "frozen-gem", "crystal-spikes"]
      },
      queen: {
        geometry: "frost-empress-queen",
        details: ["snowflake-tiara", "ice-halo", "frozen-gem"]
      },
      rook: {
        geometry: "ice-castle-rook",
        details: ["frozen-towers", "ice-walls", "snowflake-crest"]
      },
      bishop: {
        geometry: "ice-priest-bishop",
        details: ["ice-mitre", "frosted-body", "crystal-tip"]
      },
      knight: {
        geometry: "frost-warhorse-knight",
        details: ["ice-horse", "frozen-mane", "snow-crystal-armour"]
      },
      pawn: {
        geometry: "ice-orb-pawn",
        details: ["frozen-orb", "ice-body", "snowflake-base"]
      }
    }
  },

  {
    id: "fire-kingdom",
    name: "Fire Kingdom",
    theme: "Inferno Empire",
    rarity: "Legendary",
    palette: {
      white: "#FFE5C4",
      black: "#321014",
      metal: "#FF783D",
      accent: "#FFD04A"
    },
    material: "molten-metal",
    motif: "flame-sculpture",
    pieces: {
      king: {
        geometry: "inferno-king",
        details: ["flame-crown", "molten-core", "ember-mantle"]
      },
      queen: {
        geometry: "inferno-queen",
        details: ["flame-tiara", "ember-halo", "molten-gem"]
      },
      rook: {
        geometry: "volcano-rook",
        details: ["volcanic-turrets", "molten-cracks", "flame-crest"]
      },
      bishop: {
        geometry: "inferno-bishop",
        details: ["flame-mitre", "ember-staff", "molten-body"]
      },
      knight: {
        geometry: "inferno-warhorse-knight",
        details: ["flame-horse", "ember-mane", "molten-armour"]
      },
      pawn: {
        geometry: "ember-pawn",
        details: ["ember-orb", "flame-collar", "molten-base"]
      }
    }
  },

  {
    id: "emerald-dynasty",
    name: "Emerald Dynasty",
    theme: "Emerald Palace",
    rarity: "Legendary",
    palette: {
      white: "#E5FFE9",
      black: "#103B2B",
      metal: "#48D69B",
      accent: "#B5FFD5"
    },
    material: "emerald-jade",
    motif: "jade-carving",
    pieces: {
      king: {
        geometry: "emerald-dragon-king",
        details: ["jade-crown", "dragon-engraving", "emerald-core"]
      },
      queen: {
        geometry: "emerald-empress-queen",
        details: ["leaf-tiara", "jade-halo", "emerald-gem"]
      },
      rook: {
        geometry: "emerald-palace-rook",
        details: ["jade-columns", "leaf-corners", "palace-crest"]
      },
      bishop: {
        geometry: "emerald-priest-bishop",
        details: ["jade-mitre", "leaf-engraving", "green-crystal"]
      },
      knight: {
        geometry: "emerald-dragon-knight",
        details: ["dragon-horse", "jade-mane", "scale-armour"]
      },
      pawn: {
        geometry: "emerald-orb-pawn",
        details: ["jade-orb", "leaf-collar", "carved-base"]
      }
    }
  },

  {
    id: "cyber-royal",
    name: "Cyber Royal",
    theme: "Futuristic Kingdom",
    rarity: "Legendary",
    palette: {
      white: "#E9F8FF",
      black: "#10182D",
      metal: "#32D9FF",
      accent: "#E45BFF"
    },
    material: "futuristic-alloy",
    motif: "precision-cyber-geometry",
    pieces: {
      king: {
        geometry: "cyber-emperor-king",
        details: ["holographic-crown", "energy-core", "mechanical-armour"]
      },
      queen: {
        geometry: "cyber-empress-queen",
        details: ["holographic-tiara", "energy-halo", "neon-panels"]
      },
      rook: {
        geometry: "cyber-tower-rook",
        details: ["mechanical-turrets", "energy-panels", "laser-edges"]
      },
      bishop: {
        geometry: "cyber-priest-bishop",
        details: ["holographic-mitre", "energy-staff", "neon-core"]
      },
      knight: {
        geometry: "cyber-mecha-knight",
        details: ["robotic-horse", "mechanical-mane", "neon-armour"]
      },
      pawn: {
        geometry: "cyber-energy-pawn",
        details: ["energy-orb", "mechanical-body", "neon-base"]
      }
    }
  },

  {
    id: "legendary-dynasty",
    name: "Legendary Dynasty",
    theme: "Ultimate Royal Empire",
    rarity: "Mythic",
    palette: {
      white: "#FFF5DC",
      black: "#170E2A",
      metal: "#FFD66E",
      accent: "#CDA8FF"
    },
    material: "royal-mythic-alloy",
    motif: "mythic-royal-sculpture",
    pieces: {
      king: {
        geometry: "mythic-supreme-king",
        details: ["imperial-triple-crown", "floating-crown-gems", "royal-wings"]
      },
      queen: {
        geometry: "mythic-supreme-queen",
        details: ["celestial-tiara", "floating-gems", "royal-halo"]
      },
      rook: {
        geometry: "mythic-palace-rook",
        details: ["triple-towers", "royal-spires", "floating-crest"]
      },
      bishop: {
        geometry: "mythic-oracle-bishop",
        details: ["celestial-mitre", "royal-staff", "floating-crystal"]
      },
      knight: {
        geometry: "mythic-dragon-knight",
        details: ["winged-warhorse", "dragon-mane", "imperial-armour"]
      },
      pawn: {
        geometry: "mythic-royal-pawn",
        details: ["celestial-orb", "floating-ring", "triple-base"]
      }
    }
  }

]);

/*
  Each upgrade level adds real geometry features.
  The 3D factory must interpret these as model changes,
  not merely recolor the same piece.
*/

export const PIECE_UPGRADE_LEVELS = Object.freeze([
  {
    level: 1,
    title: "Basic",
    geometry: ["simple-base", "simple-body"],
    effects: [],
    detailScale: 1
  },
  {
    level: 2,
    title: "Refined",
    geometry: ["engraved-base", "body-rings"],
    effects: [],
    detailScale: 1.15
  },
  {
    level: 3,
    title: "Royal",
    geometry: ["ornamental-collar", "sculpted-details"],
    effects: ["soft-highlight"],
    detailScale: 1.3
  },
  {
    level: 4,
    title: "Imperial",
    geometry: ["royal-crest", "decorative-panels", "gem-mounts"],
    effects: ["metal-reflection"],
    detailScale: 1.5
  },
  {
    level: 5,
    title: "Mythic",
    geometry: ["extended-crown-details", "layered-ornaments"],
    effects: ["subtle-particles", "glow"],
    detailScale: 1.75
  },
  {
    level: 6,
    title: "Legendary",
    geometry: ["floating-ornaments", "complex-sculpture", "aura-rings"],
    effects: ["animated-glow", "light-trails"],
    detailScale: 2
  },
  {
    level: 7,
    title: "Supreme",
    geometry: [
      "signature-sculpture",
      "floating-gems",
      "royal-architecture",
      "animated-crown-details"
    ],
    effects: [
      "cinematic-aura",
      "premium-particles",
      "animated-reflections"
    ],
    detailScale: 2.4
  }
]);

export const PIECE_MODEL_SETTINGS = Object.freeze({
  sides: ["white", "black"],

  defaultCollection: "classic-heritage",

  defaultUpgradeLevel: 1,

  upgradeLevels: 7,

  uniqueGeometryPerPiece: true,

  uniqueGeometryPerCollection: true,

  whiteBlackDesigns: true,

  allowCollectionMixing: true,

  previewBeforePurchase: true,

  performance: Object.freeze({
    mobilePolygonBudget: 18000,
    desktopPolygonBudget: 45000,
    useLOD: true,
    useInstancingForSmallDetails: true,
    limitAnimatedParticles: true
  })
});

/* =========================================
   FILE END: config/piece-catalog.js
========================================= */
    
