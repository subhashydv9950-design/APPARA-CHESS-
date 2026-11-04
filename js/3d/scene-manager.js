
/* =========================================================
   APPARA CHESS — FILE 23
   FILE PATH: js/3d/scene-manager.js

   PURPOSE:
   3D scene creation, background, fog,
   object management and scene cleanup.

   DEPENDENCY:
   Three.js import map configured in index.html.
========================================================= */

import * as THREE from "three";

export class SceneManager {
  constructor(options = {}) {
    this.scene = null;
    this.rendererController = options.rendererController ?? null;

    this.objects = new Map();
    this.groups = new Map();

    this.settings = {
      backgroundColor: options.backgroundColor ?? 0x100b1d,
      fogEnabled: options.fogEnabled ?? true,
      fogColor: options.fogColor ?? 0x100b1d,
      fogNear: options.fogNear ?? 18,
      fogFar: options.fogFar ?? 90
    };

    this.isInitialized = false;
    this.isDisposed = false;
  }

  initialize() {
    if (this.isDisposed) {
      throw new Error("SceneManager has been disposed.");
    }

    if (this.scene) {
      return this.scene;
    }

    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(
      this.settings.backgroundColor
    );

    if (this.settings.fogEnabled) {
      this.scene.fog = new THREE.Fog(
        this.settings.fogColor,
        this.settings.fogNear,
        this.settings.fogFar
      );
    }

    this.createDefaultGroups();

    this.isInitialized = true;

    if (this.rendererController) {
      this.rendererController.setScene(this.scene);
    }

    return this.scene;
  }

  createDefaultGroups() {
    const groupNames = [
      "environment",
      "lighting",
      "chess-table",
      "chess-board",
      "chess-pieces",
      "effects",
      "particles",
      "decorations"
    ];

    for (const name of groupNames) {
      this.createGroup(name);
    }
  }

  createGroup(name) {
    this.ensureInitialized();

    if (this.groups.has(name)) {
      return this.groups.get(name);
    }

    const group = new THREE.Group();
    group.name = name;

    this.scene.add(group);
    this.groups.set(name, group);

    return group;
  }

  getGroup(name) {
    return this.groups.get(name) ?? null;
  }

  addObject(object, options = {}) {
    this.ensureInitialized();

    if (!object?.isObject3D) {
      throw new TypeError("addObject requires a Three.js Object3D.");
    }

    const groupName = options.group ?? null;
    const id = options.id ?? object.uuid;

    if (this.objects.has(id)) {
      this.removeObject(id);
    }

    const parent = groupName
      ? this.getGroup(groupName) ?? this.createGroup(groupName)
      : this.scene;

    parent.add(object);

    this.objects.set(id, {
      object,
      parent,
      groupName
    });

    return object;
  }

  addToGroup(groupName, object, id = object?.uuid) {
    return this.addObject(object, {
      group: groupName,
      id
    });
  }

  getObject(id) {
    return this.objects.get(id)?.object ?? null;
  }

  removeObject(id, options = {}) {
    const entry = this.objects.get(id);

    if (!entry) return false;

    entry.parent.remove(entry.object);

    if (options.dispose === true) {
      this.disposeObject(entry.object);
    }

    this.objects.delete(id);

    return true;
  }

  removeGroup(name, options = {}) {
    const group = this.groups.get(name);

    if (!group) return false;

    const relatedIds = [];

    for (const [id, entry] of this.objects.entries()) {
      if (entry.groupName === name) {
        relatedIds.push(id);
      }
    }

    for (const id of relatedIds) {
      this.removeObject(id, {
        dispose: options.dispose === true
      });
    }

    this.scene.remove(group);

    if (options.dispose === true) {
      this.disposeObject(group);
    }

    this.groups.delete(name);

    return true;
  }

  setBackground(color) {
    this.ensureInitialized();

    this.settings.backgroundColor = color;
    this.scene.background = new THREE.Color(color);
  }

  setFog(enabled, options = {}) {
    this.ensureInitialized();

    this.settings.fogEnabled = Boolean(enabled);

    if (!enabled) {
      this.scene.fog = null;
      return;
    }

    this.settings.fogColor =
      options.color ?? this.settings.fogColor;

    this.settings.fogNear =
      options.near ?? this.settings.fogNear;

    this.settings.fogFar =
      options.far ?? this.settings.fogFar;

    this.scene.fog = new THREE.Fog(
      this.settings.fogColor,
      this.settings.fogNear,
      this.settings.fogFar
    );
  }

  setEnvironment(backgroundColor, fogColor = backgroundColor) {
    this.setBackground(backgroundColor);

    this.setFog(true, {
      color: fogColor,
      near: this.settings.fogNear,
      far: this.settings.fogFar
    });
  }

  getScene() {
    return this.scene;
  }

  getObjectsCount() {
    return this.objects.size;
  }

  getGroups() {
    return Array.from(this.groups.keys());
  }

  ensureInitialized() {
    if (this.isDisposed) {
      throw new Error("SceneManager has been disposed.");
    }

    if (!this.scene) {
      this.initialize();
    }
  }

  disposeMaterial(material) {
    if (!material) return;

    const materials = Array.isArray(material)
      ? material
      : [material];

    for (const item of materials) {
      if (!item) continue;

      for (const value of Object.values(item)) {
        if (value?.isTexture) {
          value.dispose();
        }
      }

      item.dispose();
    }
  }

  disposeObject(object) {
    if (!object) return;

    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        this.disposeMaterial(child.material);
      }
    });
  }

  clear(options = {}) {
    if (!this.scene) return;

    const preserveGroups = options.preserveGroups ?? false;
    const dispose = options.dispose ?? false;

    for (const [id, entry] of this.objects.entries()) {
      entry.parent.remove(entry.object);

      if (dispose) {
        this.disposeObject(entry.object);
      }

      this.objects.delete(id);
    }

    if (!preserveGroups) {
      for (const [name, group] of this.groups.entries()) {
        this.scene.remove(group);

        if (dispose) {
          this.disposeObject(group);
        }

        this.groups.delete(name);
      }

      this.createDefaultGroups();
    }
  }

  dispose() {
    if (this.isDisposed) return;

    this.clear({
      preserveGroups: false,
      dispose: true
    });

    this.scene = null;
    this.groups.clear();
    this.objects.clear();

    this.isInitialized = false;
    this.isDisposed = true;
  }
}

export function createSceneManager(options = {}) {
  const manager = new SceneManager(options);
  manager.initialize();
  return manager;
}

/* =========================================================
   FILE 23 END — scene-manager.js
========================================================= */
