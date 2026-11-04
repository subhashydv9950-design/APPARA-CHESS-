// ============================================================
// APPARA CHESS
// FILE 34: QUALITY MANAGER
// PATH: js/3d/quality-manager.js
// PURPOSE: Graphics quality and performance management
// ============================================================

export const QUALITY_PRESETS = Object.freeze({
    low: {
        id: "low",
        label: "Low",
        pixelRatio: 1,
        shadowMapSize: 512,
        shadows: false,
        antialias: false,
        particles: 0.20,
        effects: 0.35,
        renderScale: 0.75,
        targetFPS: 30,
        maxLights: 3,
        reflections: false,
        bloom: false,
        ambientOcclusion: false,
        animationQuality: 0.55
    },

    medium: {
        id: "medium",
        label: "Medium",
        pixelRatio: 1.25,
        shadowMapSize: 1024,
        shadows: true,
        antialias: false,
        particles: 0.50,
        effects: 0.60,
        renderScale: 0.85,
        targetFPS: 45,
        maxLights: 5,
        reflections: false,
        bloom: false,
        ambientOcclusion: false,
        animationQuality: 0.75
    },

    high: {
        id: "high",
        label: "High",
        pixelRatio: 1.75,
        shadowMapSize: 2048,
        shadows: true,
        antialias: true,
        particles: 0.80,
        effects: 0.85,
        renderScale: 1,
        targetFPS: 60,
        maxLights: 8,
        reflections: true,
        bloom: true,
        ambientOcclusion: false,
        animationQuality: 1
    },

    ultra: {
        id: "ultra",
        label: "Ultra",
        pixelRatio: 2,
        shadowMapSize: 4096,
        shadows: true,
        antialias: true,
        particles: 1,
        effects: 1,
        renderScale: 1,
        targetFPS: 60,
        maxLights: 12,
        reflections: true,
        bloom: true,
        ambientOcclusion: true,
        animationQuality: 1
    }
});

export const QUALITY_LEVELS = Object.freeze([
    "low",
    "medium",
    "high",
    "ultra"
]);

const DEFAULT_OPTIONS = Object.freeze({
    quality: "auto",
    autoAdjust: true,
    mobileOptimization: true,
    reducedMotion: false,
    targetFPS: 60,
    sampleWindow: 1800,
    adjustmentCooldown: 5000,
    minAutoQuality: "low",
    maxAutoQuality: "ultra"
});

export class QualityManager {
    constructor(options = {}) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        };

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.effectsManager = null;
        this.animationManager = null;

        this.currentQuality = "medium";
        this.requestedQuality = this.options.quality;

        this.autoAdjust = Boolean(this.options.autoAdjust);
        this.reducedMotion = Boolean(this.options.reducedMotion);

        this.deviceInfo = {
            isMobile: false,
            memory: null,
            cores: null,
            pixelRatio: 1,
            estimatedLevel: "medium",
            webgl: false
        };

        this.performance = {
            fps: 60,
            averageFPS: 60,
            frameTime: 16.67,
            samples: [],
            lastAdjustment: 0,
            droppedFrames: 0,
            totalFrames: 0
        };

        this.listeners = new Map();
        this.initialized = false;
        this.disposed = false;

        this.initializeDeviceInfo();
        this.initialize();
    }

    // --------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------

    initialize() {
        if (this.disposed) return false;

        const initialQuality =
            this.requestedQuality === "auto"
                ? this.deviceInfo.estimatedLevel
                : this.normalizeQuality(this.requestedQuality);

        this.setQuality(initialQuality, {
            silent: true,
            force: true
        });

        this.initialized = true;

        this.emit("initialized", {
            quality: this.currentQuality,
            device: this.getDeviceInfo()
        });

        return true;
    }

    initializeDeviceInfo() {
        const nav =
            typeof navigator !== "undefined"
                ? navigator
                : null;

        const width =
            typeof window !== "undefined"
                ? window.innerWidth
                : 1024;

        const userAgent = nav?.userAgent || "";

        const isMobile =
            /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
            width <= 768;

        const memory =
            Number(nav?.deviceMemory) || null;

        const cores =
            Number(nav?.hardwareConcurrency) || null;

        const pixelRatio =
            typeof window !== "undefined"
                ? Math.max(1, window.devicePixelRatio || 1)
                : 1;

        this.deviceInfo = {
            isMobile,
            memory,
            cores,
            pixelRatio,
            estimatedLevel: this.estimateDeviceQuality(
                memory,
                cores,
                isMobile
            ),
            webgl: this.checkWebGLSupport()
        };

        return this.deviceInfo;
    }

    checkWebGLSupport() {
        if (typeof document === "undefined") {
            return false;
        }

        try {
            const canvas = document.createElement("canvas");

            return Boolean(
                canvas.getContext("webgl2") ||
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl")
            );
        } catch {
            return false;
        }
    }

    estimateDeviceQuality(memory, cores, isMobile) {
        let score = 0;

        if (memory !== null) {
            if (memory >= 8) score += 3;
            else if (memory >= 4) score += 2;
            else score += 1;
        } else {
            score += 1;
        }

        if (cores !== null) {
            if (cores >= 8) score += 3;
            else if (cores >= 4) score += 2;
            else score += 1;
        } else {
            score += 1;
        }

        if (isMobile) score -= 1;

        if (score >= 6) return "high";
        if (score >= 4) return "medium";

        return "low";
    }

    // --------------------------------------------------------
    // CONNECT COMPONENTS
    // --------------------------------------------------------

    connect(options = {}) {
        if (options.renderer) {
            this.renderer = options.renderer;
        }

        if (options.scene) {
            this.scene = options.scene;
        }

        if (options.camera) {
            this.camera = options.camera;
        }

        if (options.effectsManager) {
            this.effectsManager = options.effectsManager;
        }

        if (options.animationManager) {
            this.animationManager = options.animationManager;
        }

        this.applyCurrentQuality();

        return this;
    }

    setRenderer(renderer) {
        this.renderer = renderer;

        this.applyRendererQuality();

        return this;
    }

    setEffectsManager(manager) {
        this.effectsManager = manager;

        this.applyEffectsQuality();

        return this;
    }

    setAnimationManager(manager) {
        this.animationManager = manager;

        this.applyMotionSettings();

        return this;
    }

    // --------------------------------------------------------
    // QUALITY SELECTION
    // --------------------------------------------------------

    normalizeQuality(level) {
        const normalized = String(level || "")
            .toLowerCase()
            .trim();

        return QUALITY_LEVELS.includes(normalized)
            ? normalized
            : "medium";
    }

    setQuality(level, options = {}) {
        if (this.disposed) return false;

        const quality = this.normalizeQuality(level);

        if (
            quality === this.currentQuality &&
            !options.force
        ) {
            return true;
        }

        const previousQuality = this.currentQuality;

        this.currentQuality = quality;

        this.applyCurrentQuality();

        if (!options.silent) {
            this.emit("qualityChanged", {
                previous: previousQuality,
                current: quality,
                preset: this.getPreset()
            });
        }

        return true;
    }

    getQuality() {
        return this.currentQuality;
    }

    getPreset() {
        return {
            ...QUALITY_PRESETS[this.currentQuality]
        };
    }

    getAllPresets() {
        return QUALITY_LEVELS.map(level => ({
            ...QUALITY_PRESETS[level]
        }));
    }

    getQualityOptions() {
        return this.getAllPresets().map(preset => ({
            value: preset.id,
            label: preset.label,
            selected: preset.id === this.currentQuality
        }));
    }

    // --------------------------------------------------------
    // APPLY QUALITY
    // --------------------------------------------------------

    applyCurrentQuality() {
        this.applyRendererQuality();
        this.applyEffectsQuality();
        this.applyMotionSettings();
        this.applySceneQuality();

        this.emit("qualityApplied", {
            quality: this.currentQuality,
            preset: this.getPreset()
        });
    }

    applyRendererQuality() {
        if (!this.renderer) return;

        const preset = this.getPreset();
        const renderer = this.renderer;

        try {
            if (
                typeof renderer.setQuality === "function"
            ) {
                renderer.setQuality(this.currentQuality);
            }

            const rawRenderer =
                renderer.renderer ||
                renderer.webglRenderer ||
                renderer;

            if (
                rawRenderer &&
                typeof rawRenderer.setPixelRatio === "function"
            ) {
                const deviceRatio =
                    this.deviceInfo.pixelRatio || 1;

                const pixelRatio = Math.min(
                    deviceRatio,
                    preset.pixelRatio
                );

                rawRenderer.setPixelRatio(pixelRatio);
            }

            if (rawRenderer?.shadowMap) {
                rawRenderer.shadowMap.enabled =
                    preset.shadows;

                if (
                    rawRenderer.shadowMap.type !== undefined
                ) {
                    rawRenderer.shadowMap.type =
                        preset.shadows
                            ? 2
                            : 0;
                }
            }

            if (rawRenderer?.capabilities) {
                rawRenderer.capabilities.maxTextures =
                    rawRenderer.capabilities.maxTextures;
            }
        } catch (error) {
            this.emit("error", {
                source: "renderer",
                error
            });
        }
    }

    applyEffectsQuality() {
        if (!this.effectsManager) return;

        const preset = this.getPreset();

        try {
            if (
                typeof this.effectsManager.setQuality === "function"
            ) {
                this.effectsManager.setQuality(
                    this.currentQuality
                );
            }

            if (
                typeof this.effectsManager.setReducedMotion === "function"
            ) {
                this.effectsManager.setReducedMotion(
                    this.reducedMotion
                );
            }

            if (
                typeof this.effectsManager.setParticleLimit === "function"
            ) {
                this.effectsManager.setParticleLimit(
                    preset.particles
                );
            }
        } catch (error) {
            this.emit("error", {
                source: "effects",
                error
            });
        }
    }

    applyMotionSettings() {
        if (!this.animationManager) return;

        try {
            if (
                typeof this.animationManager.setReducedMotion === "function"
            ) {
                this.animationManager.setReducedMotion(
                    this.reducedMotion
                );
            }

            if (
                typeof this.animationManager.setQuality === "function"
            ) {
                this.animationManager.setQuality(
                    this.currentQuality
                );
            }
        } catch (error) {
            this.emit("error", {
                source: "animation",
                error
            });
        }
    }

    applySceneQuality() {
        if (!this.scene) return;

        const preset = this.getPreset();

        try {
            if (
                typeof this.scene.setQuality === "function"
            ) {
                this.scene.setQuality(this.currentQuality);
            }

            this.scene.traverse?.(object => {
                if (object.isLight && object.castShadow) {
                    object.castShadow = preset.shadows;

                    if (object.shadow?.mapSize) {
                        object.shadow.mapSize.set(
                            preset.shadowMapSize,
                            preset.shadowMapSize
                        );
                    }
                }
            });
        } catch (error) {
            this.emit("error", {
                source: "scene",
                error
            });
        }
    }

    // --------------------------------------------------------
    // AUTO QUALITY
    // --------------------------------------------------------

    setAutoAdjust(enabled) {
        this.autoAdjust = Boolean(enabled);

        this.emit("autoAdjustChanged", {
            enabled: this.autoAdjust
        });

        return this.autoAdjust;
    }

    getAutoAdjust() {
        return this.autoAdjust;
    }

    updatePerformance(deltaTime) {
        if (this.disposed) return;

        const delta = Number(deltaTime);

        if (!Number.isFinite(delta) || delta <= 0) {
            return;
        }

        const frameTime = delta * 1000;

        const fps = 1000 / frameTime;

        this.performance.totalFrames++;

        if (frameTime > 1000 / 30) {
            this.performance.droppedFrames++;
        }

        this.performance.samples.push({
            fps,
            frameTime
        });

        const maxSamples = 90;

        if (
            this.performance.samples.length > maxSamples
        ) {
            this.performance.samples.shift();
        }

        const totalFPS = this.performance.samples.reduce(
            (sum, sample) => sum + sample.fps,
            0
        );

        const totalFrameTime = this.performance.samples.reduce(
            (sum, sample) => sum + sample.frameTime,
            0
        );

        const count = this.performance.samples.length;

        this.performance.fps = fps;

        this.performance.averageFPS =
            totalFPS / count;

        this.performance.frameTime =
            totalFrameTime / count;

        if (this.autoAdjust) {
            this.evaluatePerformance();
        }
    }

    evaluatePerformance() {
        const now = Date.now();

        if (
            now - this.performance.lastAdjustment <
            this.options.adjustmentCooldown
        ) {
            return;
        }

        const averageFPS =
            this.performance.averageFPS;

        const targetFPS =
            this.getPreset().targetFPS;

        const currentIndex =
            QUALITY_LEVELS.indexOf(this.currentQuality);

        const minimumIndex =
            QUALITY_LEVELS.indexOf(
                this.normalizeQuality(
                    this.options.minAutoQuality
                )
            );

        const maximumIndex =
            QUALITY_LEVELS.indexOf(
                this.normalizeQuality(
                    this.options.maxAutoQuality
                )
            );

        let nextIndex = currentIndex;

        if (averageFPS < targetFPS * 0.72) {
            nextIndex--;
        } else if (
            averageFPS > targetFPS * 0.94 &&
            this.performance.samples.length >= 60
        ) {
            nextIndex++;
        }

        nextIndex = Math.max(
            minimumIndex,
            Math.min(maximumIndex, nextIndex)
        );

        if (nextIndex !== currentIndex) {
            this.performance.lastAdjustment = now;

            const nextQuality =
                QUALITY_LEVELS[nextIndex];

            this.setQuality(nextQuality);

            this.emit("autoQualityChanged", {
                previous: QUALITY_LEVELS[currentIndex],
                current: nextQuality,
                averageFPS
            });
        }
    }

    // --------------------------------------------------------
    // REDUCED MOTION
    // --------------------------------------------------------

    setReducedMotion(enabled) {
        this.reducedMotion = Boolean(enabled);

        this.applyMotionSettings();
        this.applyEffectsQuality();

        this.emit("reducedMotionChanged", {
            enabled: this.reducedMotion
        });

        return this.reducedMotion;
    }

    getReducedMotion() {
        return this.reducedMotion;
    }

    detectSystemReducedMotion() {
        if (typeof window === "undefined") {
            return false;
        }

        try {
            return Boolean(
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
            );
        } catch {
            return false;
        }
    }

    useSystemMotionPreference() {
        const preference =
            this.detectSystemReducedMotion();

        this.setReducedMotion(preference);

        return preference;
    }

    // --------------------------------------------------------
    // MOBILE OPTIMIZATION
    // --------------------------------------------------------

    optimizeForMobile() {
        if (!this.deviceInfo.isMobile) {
            return false;
        }

        const currentIndex =
            QUALITY_LEVELS.indexOf(this.currentQuality);

        const safeIndex = Math.min(
            currentIndex,
            QUALITY_LEVELS.indexOf("high")
        );

        this.setQuality(QUALITY_LEVELS[safeIndex]);

        this.emit("mobileOptimized", {
            quality: this.currentQuality
        });

        return true;
    }

    getDeviceInfo() {
        return {
            ...this.deviceInfo
        };
    }

    getPerformanceStats() {
        return {
            fps: Number(
                this.performance.fps.toFixed(1)
            ),

            averageFPS: Number(
                this.performance.averageFPS.toFixed(1)
            ),

            frameTime: Number(
                this.performance.frameTime.toFixed(2)
            ),

            droppedFrames:
                this.performance.droppedFrames,

            totalFrames:
                this.performance.totalFrames,

            quality: this.currentQuality,

            autoAdjust: this.autoAdjust
        };
    }

    // --------------------------------------------------------
    // EVENT SYSTEM
    // --------------------------------------------------------

    on(eventName, callback) {
        if (
            typeof callback !== "function"
        ) {
            return () => {};
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    }

    off(eventName, callback) {
        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) return;

        callbacks.delete(callback);

        if (callbacks.size === 0) {
            this.listeners.delete(eventName);
        }
    }

    emit(eventName, data = {}) {
        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) return;

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                if (eventName !== "error") {
                    this.emit("error", {
                        source: eventName,
                        error
                    });
                }
            }
        });
    }
  
 // --------------------------------------------------------
    // RESET AND DISPOSE
    // --------------------------------------------------------

    resetPerformanceStats() {
        this.performance = {
            fps: 60,
            averageFPS: 60,
            frameTime: 16.67,
            samples: [],
            lastAdjustment: 0,
            droppedFrames: 0,
            totalFrames: 0
        };
    }

    reset() {
        this.resetPerformanceStats();

        const quality =
            this.requestedQuality === "auto"
                ? this.deviceInfo.estimatedLevel
                : this.normalizeQuality(
                    this.requestedQuality
                );

        this.setQuality(quality, {
            force: true
        });
    }

    dispose() {
        if (this.disposed) return;

        this.listeners.clear();

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.effectsManager = null;
        this.animationManager = null;

        this.performance.samples = [];

        this.initialized = false;
        this.disposed = true;
    }
}
// ============================================================
// FACTORY
// ============================================================

export function createQualityManager(options = {}) {
    return new QualityManager(options);
}

// ============================================================
// FILE 34 END
// ============================================================
