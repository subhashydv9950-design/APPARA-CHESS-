
/* =========================================
   APPARA CHESS
   FILE: config/asset-manifest.js
   SECTION: CONFIG
========================================= */

const ROOT = "./";

export const ASSET_PATHS = Object.freeze({
  models: `${ROOT}models/`,
  textures: `${ROOT}textures/`,
  audio: `${ROOT}audio/`,
  icons: `${ROOT}icons/`
});

export const MODEL_ASSETS = Object.freeze({

  pieces: Object.freeze({
    king: "pieces/king.glb",
    queen: "pieces/queen.glb",
    rook: "pieces/rook.glb",
    bishop: "pieces/bishop.glb",
    knight: "pieces/knight.glb",
    pawn: "pieces/pawn.glb"
  }),

  board: Object.freeze({
    main: "boards/chess-board.glb",
    border: "boards/board-border.glb",
    coordinates: "boards/board-coordinates.glb"
  }),

  table: Object.freeze({
    main: "tables/royal-table.glb",
    legs: "tables/table-legs.glb",
    decorations: "tables/table-decorations.glb"
  }),

  environment: Object.freeze({
    palace: "environment/royal-palace.glb",
    floor: "environment/palace-floor.glb",
    pillars: "environment/pillars.glb",
    furniture: "environment/furniture.glb"
  })
});

export const TEXTURE_ASSETS = Object.freeze({

  materials: Object.freeze({
    gold: "materials/gold/",
    silver: "materials/silver/",
    marble: "materials/marble/",
    wood: "materials/wood/",
    crystal: "materials/crystal/",
    obsidian: "materials/obsidian/",
    ice: "materials/ice/",
    emerald: "materials/emerald/"
  }),

  effects: Object.freeze({
    glow: "effects/glow/",
    reflections: "effects/reflections/",
    particles: "effects/particles/"
  })
});

export const AUDIO_ASSETS = Object.freeze({

  music: Object.freeze({
    menu: "music/royal-menu.mp3",
    game: "music/chess-arena.mp3",
    victory: "music/victory.mp3",
    defeat: "music/defeat.mp3"
  }),

  pieces: Object.freeze({
    select: "pieces/piece-select.mp3",
    move: "pieces/piece-move.mp3",
    capture: "pieces/piece-capture.mp3",
    check: "pieces/check-alert.mp3"
  }),

  interface: Object.freeze({
    click: "interface/button-click.mp3",
    open: "interface/panel-open.mp3",
    close: "interface/panel-close.mp3",
    reward: "interface/reward.mp3",
    levelUp: "interface/level-up.mp3"
  }),

  environment: Object.freeze({
    ambience: "environment/palace-ambience.mp3"
  })
});

export const ICON_ASSETS = Object.freeze({

  app: "app-icon.png",
  app192: "icon-192.png",
  app512: "icon-512.png",

  categories: {
    home: "home.svg",
    garage: "garage.svg",
    online: "online.svg",
    profile: "profile.svg",
    settings: "settings.svg",
    shop: "shop.svg",
    trophy: "trophy.svg"
  }
});

export const ASSET_LOADING_CONFIG = Object.freeze({

  modelFormat: "glb",

  textureFormats: [
    "webp",
    "png",
    "jpg"
  ],

  lazyLoad: true,

  preload: [
    "pieces/king.glb",
    "pieces/queen.glb",
    "pieces/rook.glb",
    "pieces/bishop.glb",
    "pieces/knight.glb",
    "pieces/pawn.glb",
    "boards/chess-board.glb"
  ],

  fallback: {
    useProceduralModels: true,
    useDefaultMaterials: true,
    allowMissingOptionalAudio: true
  },

  mobile: {
    maxConcurrentLoads: 3,
    textureQuality: "high"
  },

  desktop: {
    maxConcurrentLoads: 6,
    textureQuality: "ultra"
  }
});

/**
 * Convert an asset's relative path into its full path.
 * Unknown or invalid asset paths return null.
 */
export function getAssetPath(category, assetPath) {

  const allowedCategories = [
    "models",
    "textures",
    "audio",
    "icons"
  ];

  if (!allowedCategories.includes(category)) {
    return null;
  }

  if (
    typeof assetPath !== "string" ||
    !assetPath.trim() ||
    assetPath.startsWith("/") ||
    assetPath.includes("\\") ||
    assetPath.split("/").some(
      part => part === ".." || part === "."
    )
  ) {
    return null;
  }

  return `${ASSET_PATHS[category]}${assetPath}`;
}

/* =========================================
   FILE END: config/asset-manifest.js
========================================= */
