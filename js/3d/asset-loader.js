
import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export class AssetLoader {
  constructor(options = {}) {
    this.options = {
      dracoPath: "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
      enableDraco: true,
      textureColorSpace: THREE.SRGBColorSpace,
      ...options
    };

    this.manager = new THREE.LoadingManager();

    this.gltfLoader = new GLTFLoader(this.manager);
    this.textureLoader = new THREE.TextureLoader(this.manager);
    this.rgbeLoader = new RGBELoader(this.manager);

    this.dracoLoader = null;

    this.modelCache = new Map();
    this.textureCache = new Map();
    this.environmentCache = new Map();

    this.pendingLoads = new Map();
    this.failedAssets = new Map();

    this.disposed = false;

    this.progress = {
      loaded: 0,
      total: 0,
      currentUrl: "",
      percent: 0,
      isLoading: false
    };

    this.callbacks = {
      onProgress: null,
      onLoad: null,
      onError: null,
      onComplete: null
    };

    this.configureLoadingManager();
    this.configureDRACO();
  }

  configureLoadingManager() {
    this.manager.onStart = (url, loaded, total) => {
      this.progress.isLoading = true;
      this.progress.currentUrl = url;
      this.progress.loaded = loaded;
      this.progress.total = total;

      this.emitProgress();
    };

    this.manager.onProgress = (url, loaded, total) => {
      this.progress.currentUrl = url;
      this.progress.loaded = loaded;
      this.progress.total = total;

      this.progress.percent = total > 0
        ? Math.round((loaded / total) * 100)
        : 0;

      this.emitProgress();
    };

    this.manager.onLoad = () => {
      this.progress.isLoading = false;
      this.progress.percent = 100;

      this.callbacks.onComplete?.(
        this.getProgress()
      );
    };

    this.manager.onError = url => {
      this.failedAssets.set(
        url,
        new Error(`Failed to load asset: ${url}`)
      );

      this.callbacks.onError?.(
        this.failedAssets.get(url),
        url
      );
    };
  }

  configureDRACO() {
    if (!this.options.enableDraco) return;

    this.dracoLoader = new DRACOLoader();

    this.dracoLoader.setDecoderPath(
      this.options.dracoPath
    );

    this.gltfLoader.setDRACOLoader(
      this.dracoLoader
    );
  }

  setCallbacks(callbacks = {}) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks
    };

    return this;
  }

  emitProgress() {
    this.callbacks.onProgress?.(
      this.getProgress()
    );
  }

  getProgress() {
    return {
      ...this.progress
    };
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error(
        "AssetLoader has already been disposed."
      );
    }
  }

  validateUrl(url) {
    if (
      typeof url !== "string" ||
      url.trim().length === 0
    ) {
      throw new TypeError(
        "A valid asset URL is required."
      );
    }

    return url.trim();
  }

  getCacheKey(url, options = {}) {
    return `${url}::${JSON.stringify(options)}`;
  }

  loadGLTF(url, options = {}) {
    this.ensureActive();
    url = this.validateUrl(url);

    const cacheKey = this.getCacheKey(url, {
      resourcePath: options.resourcePath || ""
    });

    if (
      !options.forceReload &&
      this.modelCache.has(cacheKey)
    ) {
      return Promise.resolve(
        this.modelCache.get(cacheKey)
      );
    }

    if (
      !options.forceReload &&
      this.pendingLoads.has(cacheKey)
    ) {
      return this.pendingLoads.get(cacheKey);
    }

    const promise = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,

        gltf => {
          this.modelCache.set(cacheKey, gltf);
          this.pendingLoads.delete(cacheKey);

          this.callbacks.onLoad?.({
            type: "gltf",
            url,
            asset: gltf
          });

          resolve(gltf);
        },

        event => {
          if (options.onProgress && event.lengthComputable) {
            options.onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: Math.round(
                (event.loaded / event.total) * 100
              )
            });
          }
        },

        error => {
          this.pendingLoads.delete(cacheKey);
          this.failedAssets.set(url, error);

          this.callbacks.onError?.(
            error,
            url
          );

          reject(error);
        },

        options.resourcePath
      );
    });

    this.pendingLoads.set(cacheKey, promise);

    return promise;
  }

  async loadModel(url, options = {}) {
    const gltf = await this.loadGLTF(url, options);

    const sourceScene = gltf.scene;

    if (!sourceScene) {
      throw new Error(
        `GLTF file has no scene: ${url}`
      );
    }

    const model = options.clone === false
      ? sourceScene
      : sourceScene.clone(true);

    if (options.name) {
      model.name = options.name;
    }

    if (options.scale !== undefined) {
      if (typeof options.scale === "number") {
        model.scale.setScalar(options.scale);
      } else {
        model.scale.set(
          options.scale.x ?? 1,
          options.scale.y ?? 1,
          options.scale.z ?? 1
        );
      }
    }

    if (options.position) {
      model.position.set(
        options.position.x ?? 0,
        options.position.y ?? 0,
        options.position.z ?? 0
      );
    }

    if (options.rotation) {
      model.rotation.set(
        options.rotation.x ?? 0,
        options.rotation.y ?? 0,
        options.rotation.z ?? 0
      );
    }

    if (options.castShadow !== false) {
      model.traverse(object => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    model.userData = {
      ...model.userData,
      sourceUrl: url,
      assetType: "gltf-model"
    };

    return {
      model,
      animations: gltf.animations || [],
      scene: gltf.scene,
      cameras: gltf.cameras || []
    };
  }

  loadTexture(url, options = {}) {
    this.ensureActive();
    url = this.validateUrl(url);

    const cacheKey = this.getCacheKey(url, {
      colorSpace: options.colorSpace || "srgb",
      mapping: options.mapping || "default"
    });

    if (
      !options.forceReload &&
      this.textureCache.has(cacheKey)
    ) {
      return Promise.resolve(
        this.textureCache.get(cacheKey)
      );
    }

    if (
      !options.forceReload &&
      this.pendingLoads.has(cacheKey)
    ) {
      return this.pendingLoads.get(cacheKey);
    }

    const promise = new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,

        texture => {
          texture.colorSpace =
            options.colorSpace ||
            this.options.textureColorSpace;

          if (options.mapping) {
            texture.mapping = options.mapping;
          }

          if (options.wrapS) {
            texture.wrapS = options.wrapS;
          }

          if (options.wrapT) {
            texture.wrapT = options.wrapT;
          }

          if (options.repeat) {
            texture.repeat.set(
              options.repeat.x ?? 1,
              options.repeat.y ?? 1
            );
          }

          if (options.flipY !== undefined) {
            texture.flipY = options.flipY;
          }

          texture.needsUpdate = true;

          this.textureCache.set(
            cacheKey,
            texture
          );

          this.pendingLoads.delete(cacheKey);

          this.callbacks.onLoad?.({
            type: "texture",
            url,
            asset: texture
          });

          resolve(texture);
        },

        event => {
          if (options.onProgress && event.lengthComputable) {
            options.onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: Math.round(
                (event.loaded / event.total) * 100
              )
            });
          }
        },

        error => {
          this.pendingLoads.delete(cacheKey);
          this.failedAssets.set(url, error);

          this.callbacks.onError?.(
            error,
            url
          );

          reject(error);
        }
      );
    });

    this.pendingLoads.set(cacheKey, promise);

    return promise;
  }

  loadHDR(url, options = {}) {
    this.ensureActive();
    url = this.validateUrl(url);

    const cacheKey = this.getCacheKey(url);

    if (
      !options.forceReload &&
      this.environmentCache.has(cacheKey)
    ) {
      return Promise.resolve(
        this.environmentCache.get(cacheKey)
      );
    }

    if (
      !options.forceReload &&
      this.pendingLoads.has(cacheKey)
    ) {
      return this.pendingLoads.get(cacheKey);
    }

    const promise = new Promise((resolve, reject) => {
      this.rgbeLoader.load(
        url,

        texture => {
          texture.mapping =
            THREE.EquirectangularReflectionMapping;

          this.environmentCache.set(
            cacheKey,
            texture
          );

          this.pendingLoads.delete(cacheKey);

          this.callbacks.onLoad?.({
            type: "hdr",
            url,
            asset: texture
          });

          resolve(texture);
        },

        options.onProgress,

        error => {
          this.pendingLoads.delete(cacheKey);
          this.failedAssets.set(url, error);

          this.callbacks.onError?.(
            error,
            url
          );

          reject(error);
        }
      );
    });

    this.pendingLoads.set(cacheKey, promise);

    return promise;
  }

  async loadManifest(manifest = {}) {
    this.ensureActive();

    const results = {
      models: {},
      textures: {},
      environments: {},
      errors: []
    };

    const jobs = [];

    for (const [name, entry] of Object.entries(
      manifest.models || {}
    )) {
      const url = typeof entry === "string"
        ? entry
        : entry.url;

      if (!url) continue;

      jobs.push(
        this.loadGLTF(url, entry.options || {})
          .then(asset => {
            results.models[name] = asset;
          })
          .catch(error => {
            results.errors.push({
              type: "model",
              name,
              url,
              error
            });
          })
      );
    }

    for (const [name, entry] of Object.entries(
      manifest.textures || {}
    )) {
      const url = typeof entry === "string"
        ? entry
        : entry.url;

      if (!url) continue;

      jobs.push(
        this.loadTexture(url, entry.options || {})
          .then(asset => {
            results.textures[name] = asset;
          })
          .catch(error => {
            results.errors.push({
              type: "texture",
              name,
              url,
              error
            });
          })
      );
    }

    for (const [name, entry] of Object.entries(
      manifest.environments || {}
    )) {
      const url = typeof entry === "string"
        ? entry
        : entry.url;

      if (!url) continue;

      jobs.push(
        this.loadHDR(url, entry.options || {})
          .then(asset => {
            results.environments[name] = asset;
          })
          .catch(error => {
            results.errors.push({
              type: "environment",
              name,
              url,
              error
            });
          })
      );
    }

    await Promise.all(jobs);

    return results;
  }

  getModel(url) {
    for (const [key, value] of this.modelCache) {
      if (key.startsWith(`${url}::`)) {
        return value;
      }
    }

    return null;
  }

  getTexture(url) {
    for (const [key, value] of this.textureCache) {
      if (key.startsWith(`${url}::`)) {
        return value;
      }
    }

    return null;
  }

  getFailedAssets() {
    return Array.from(
      this.failedAssets.entries()
    ).map(([url, error]) => ({
      url,
      message: error?.message || "Unknown error"
    }));
  }

  clearFailedAssets() {
    this.failedAssets.clear();
  }

  clearCaches() {
    this.textureCache.forEach(texture => {
      texture.dispose();
    });

    this.environmentCache.forEach(texture => {
      texture.dispose();
    });

    // GLTF model geometry/material ownership may be shared
    // with active scene objects, so models are not disposed here.
    this.textureCache.clear();
    this.environmentCache.clear();
    this.modelCache.clear();
  }

  dispose() {
    if (this.disposed) return;

    this.clearCaches();

    this.pendingLoads.clear();
    this.failedAssets.clear();

    this.dracoLoader?.dispose();

    this.disposed = true;
  }
}

export function createAssetLoader(options = {}) {
  return new AssetLoader(options);
}

// FILE 31 END — asset-loader.js
          
