/**
 * Platform detection utilities for dual IAP architecture.
 * Detects whether the app is running inside a native Capacitor shell
 * or as a standard web/PWA experience.
 */

import { Capacitor } from "@capacitor/core";

export type AppPlatform = "ios" | "android" | "web";

export function getPlatform(): AppPlatform {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === "ios") return "ios";
    if (platform === "android") return "android";
  }
  return "web";
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}
