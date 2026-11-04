/* =========================================================
   APPARA CHESS — NOTIFICATION SERVICE
   FILE: js/services/notification-service.js
   PART: 1 OF 2

   FEATURES:
   - In-app notifications
   - Browser notifications
   - Notification preferences
   - Read and unread status
   - Notification history
   ========================================================= */

import { EventBus, APP_EVENTS } from "../core/event-bus.js";

export const NOTIFICATION_EVENTS = Object.freeze({
  CREATED: "notification:created",
  READ: "notification:read",
  READ_ALL: "notification:read-all",
  REMOVED: "notification:removed",
  CLEARED: "notification:cleared",
  PERMISSION_CHANGED: "notification:permission-changed",
  ERROR: "notification:error"
});

const MAX_NOTIFICATIONS = 100;

const DEFAULT_PREFERENCES = Object.freeze({
  friendRequests: true,
  gameInvites: true,
  tournamentUpdates: true,
  dailyRewards: true,
  achievements: true,
  system: true,
  browserNotifications: false
});

const VALID_CATEGORIES = Object.freeze([
  "friendRequests",
  "gameInvites",
  "tournamentUpdates",
  "dailyRewards",
  "achievements",
  "system"
]);

function createNotificationId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `notif-${crypto.randomUUID()}`;
  }

  return `notif-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeText(value, maxLength = 240) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function cloneNotification(notification) {
  return { ...notification };
}

export class NotificationService {
  constructor({
    settingsService = null,
    eventBus = EventBus,
    maxNotifications = MAX_NOTIFICATIONS
  } = {}) {
    this.settingsService = settingsService;
    this.eventBus = eventBus;

    this.maxNotifications = Math.max(
      10,
      Math.min(500, Number(maxNotifications) || MAX_NOTIFICATIONS)
    );

    this.notifications = [];
    this.listeners = new Map();
    this.preferences = { ...DEFAULT_PREFERENCES };

    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;

    try {
      const savedPreferences =
        this.settingsService?.get?.("notifications");

      if (
        savedPreferences &&
        typeof savedPreferences === "object"
      ) {
        this.preferences = {
          ...this.preferences,
          ...savedPreferences
        };
      }
    } catch (error) {
      this.emit(NOTIFICATION_EVENTS.ERROR, error);
    }

    this.initialized = true;

    return this;
  }

  getPreferences() {
    return { ...this.preferences };
  }

  isCategoryEnabled(category) {
    if (!VALID_CATEGORIES.includes(category)) {
      return false;
    }

    return this.preferences[category] !== false;
  }

  setPreference(key, enabled) {
    if (!Object.hasOwn(this.preferences, key)) {
      throw new Error(
        `Unknown notification preference: ${key}`
      );
    }

    this.preferences[key] = Boolean(enabled);

    if (key !== "browserNotifications") {
      try {
        this.settingsService?.updateSection?.(
          "notifications",
          { [key]: Boolean(enabled) }
        );
      } catch (error) {
        this.emit(NOTIFICATION_EVENTS.ERROR, error);
      }
    }

    return this.preferences[key];
  }

  notify({
    title,
    message,
    category = "system",
    type = "info",
    data = null,
    actionLabel = "",
    action = null,
    browser = false
  } = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(
        `Invalid notification category: ${category}`
      );
    }

    if (!this.isCategoryEnabled(category)) {
      return null;
    }

    const safeTitle = normalizeText(title, 100);
    const safeMessage = normalizeText(message, 500);

    if (!safeTitle && !safeMessage) {
      throw new Error(
        "Notification title or message is required."
      );
    }

    const notification = {
      id: createNotificationId(),
      title: safeTitle,
      message: safeMessage,
      category,
      type: ["info", "success", "warning", "error"].includes(type)
        ? type
        : "info",
      data,
      actionLabel: normalizeText(actionLabel, 40),
      action: typeof action === "function" ? action : null,
      read: false,
      createdAt: Date.now()
    };

    this.notifications.unshift(notification);

    if (this.notifications.length > this.maxNotifications) {
      this.notifications.length = this.maxNotifications;
    }

    this.emit(
      NOTIFICATION_EVENTS.CREATED,
      this.toPublicNotification(notification)
    );

    this.eventBus?.emit?.(
      APP_EVENTS.UI.NOTIFICATION,
      this.toPublicNotification(notification)
    );

    if (browser) {
      this.showBrowserNotification(notification);
    }

    return this.toPublicNotification(notification);
  }

  toPublicNotification(notification) {
    const {
      action,
      ...publicNotification
    } = notification;

    return cloneNotification(publicNotification);
  }

  getAll({ category = null, unreadOnly = false } = {}) {
    return this.notifications
      .filter(notification => {
        if (category && notification.category !== category) {
          return false;
        }

        if (unreadOnly && notification.read) {
          return false;
        }

        return true;
      })
      .map(notification =>
        this.toPublicNotification(notification)
      );
  }

  getById(notificationId) {
    const notification = this.notifications.find(
      item => item.id === notificationId
    );

    return notification
      ? this.toPublicNotification(notification)
      : null;
  }

  getUnreadCount() {
    return this.notifications.filter(
      notification => !notification.read
    ).length;
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(
      item => item.id === notificationId
    );

    if (!notification) return false;

    if (notification.read) return true;

    notification.read = true;
    notification.readAt = Date.now();

    this.emit(
      NOTIFICATION_EVENTS.READ,
      this.toPublicNotification(notification)
    );

    return true;
  }

  markAllAsRead() {
    const now = Date.now();

    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = now;
      }
    });

    this.emit(
      NOTIFICATION_EVENTS.READ_ALL,
      { timestamp: now }
    );

    return this.getUnreadCount();
  }

/* =========================================================
   FILE: js/services/notification-service.js
   PART 1 COMPLETE — FILE NOT COMPLETE YET
   NEXT: PART 2
   ========================================================= */
  remove(notificationId) {
    const index = this.notifications.findIndex(
      item => item.id === notificationId
    );

    if (index === -1) return false;

    const [removed] = this.notifications.splice(index, 1);

    this.emit(
      NOTIFICATION_EVENTS.REMOVED,
      { id: removed.id }
    );

    return true;
  }

  clearAll() {
    const count = this.notifications.length;

    this.notifications = [];

    this.emit(
      NOTIFICATION_EVENTS.CLEARED,
      { count }
    );

    return count;
  }

  async requestBrowserPermission() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return "unsupported";
    }

    try {
      const permission =
        await window.Notification.requestPermission();

      this.preferences.browserNotifications =
        permission === "granted";

      this.emit(
        NOTIFICATION_EVENTS.PERMISSION_CHANGED,
        { permission }
      );

      return permission;
    } catch (error) {
      this.emit(NOTIFICATION_EVENTS.ERROR, error);
      return "denied";
    }
  }

  getBrowserPermission() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return "unsupported";
    }

    return window.Notification.permission;
  }

  showBrowserNotification(notification) {
    if (!this.preferences.browserNotifications) {
      return false;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return false;
    }

    if (window.Notification.permission !== "granted") {
      return false;
    }

    try {
      const browserNotification = new window.Notification(
        notification.title || "APPARA CHESS",
        {
          body: notification.message,
          tag: notification.id,
          icon: "./icons/app-icon.svg"
        }
      );

      browserNotification.onclick = () => {
        try {
          window.focus();
        } catch {
          // Browser focus may not be available.
        }

        browserNotification.close();
      };

      return true;
    } catch (error) {
      this.emit(NOTIFICATION_EVENTS.ERROR, error);
      return false;
    }
  }

  executeAction(notificationId) {
    const notification = this.notifications.find(
      item => item.id === notificationId
    );

    if (!notification || typeof notification.action !== "function") {
      return false;
    }

    try {
      notification.action();
      this.markAsRead(notificationId);
      return true;
    } catch (error) {
      this.emit(NOTIFICATION_EVENTS.ERROR, error);
      return false;
    }
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "Notification callback must be a function."
      );
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[APPARA CHESS] Notification listener error:",
          error
        );
      }
    });

    this.eventBus?.emit?.(event, payload);
  }

  dispose() {
    this.listeners.clear();
    this.notifications = [];
    this.initialized = false;
  }
}

export function createNotificationService(dependencies = {}) {
  return new NotificationService(dependencies);
}

/* =========================================================
   FILE: js/services/notification-service.js
   PART 2 COMPLETE
   FULL FILE COMPLETE — NEW FILE 2/10
   ========================================================= */
