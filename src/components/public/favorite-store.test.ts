import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFavoriteSlugs,
  isFavorite,
  removeUnavailableFavorites,
  subscribeToFavorites,
  toggleFavorite,
} from "./favorite-store";

beforeEach(() => {
  localStorage.clear();
  getFavoriteSlugs();
});

describe("local favorites", () => {
  it("toggles favorites and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFavorites(listener);
    expect(toggleFavorite("lote-um")).toBe(true);
    expect(isFavorite("lote-um")).toBe(true);
    expect(toggleFavorite("lote-um")).toBe(false);
    expect(getFavoriteSlugs()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("deduplicates, bounds and validates values read from storage", () => {
    const invalid = ["lote-valido", "lote-valido", "../admin", 2, ...Array.from({ length: 35 }, (_, index) => `lote-${index}`)];
    localStorage.setItem("leiloes-rfb:favorites:v1", JSON.stringify(invalid));
    expect(getFavoriteSlugs()).toHaveLength(30);
    expect(new Set(getFavoriteSlugs()).size).toBe(30);
    expect(getFavoriteSlugs()).not.toContain("../admin");
  });

  it("removes slugs that are no longer publicly available", () => {
    toggleFavorite("lote-um");
    toggleFavorite("lote-dois");
    removeUnavailableFavorites(["lote-dois"]);
    expect(getFavoriteSlugs()).toEqual(["lote-dois"]);
  });

  it("handles corrupted storage without throwing", () => {
    localStorage.setItem("leiloes-rfb:favorites:v1", "<script>");
    expect(getFavoriteSlugs()).toEqual([]);
  });
});