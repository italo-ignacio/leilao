import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LotCard } from "./lot-card";

const lot = {
  id: "lot-test-id",
  number: 59,
  slug: "edital-teste-lote-59",
  title: "Console de teste",
  minimumBid: "824.00",
  state: "SP",
  city: "Bauru",
  status: "UNSCHEDULED" as const,
  category: { name: "Videogame", slug: "videogame" },
  images: [],
  items: [
    { position: 0, quantity: "2", unit: "un", description: "Nintendo Switch 2" },
    { position: 1, quantity: "0.125", unit: "kg", description: "Acessório do console" },
  ],
  auction: {
    slug: "edital-teste",
    officialNumber: "0800100/000014/2026",
    title: "Edital de teste",
    proposalEndsAt: null,
  },
};

describe("LotCard merchandise dialog", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });

  afterEach(() => {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  });

  it("shows each item with quantity and unit without navigating to lot details", () => {
    render(<LotCard lot={lot} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver 2 mercadorias do lote 59" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mercadorias" })).toBeVisible();
    expect(screen.getByText("Nintendo Switch 2")).toBeVisible();
    expect(screen.getByText("2 un")).toBeVisible();
    expect(screen.getByText("Acessório do console")).toBeVisible();
    expect(screen.getByText("0,125 kg")).toBeVisible();
    expect(screen.getByRole("link", { name: "Console de teste" })).toHaveAttribute("href", "/lotes/edital-teste-lote-59");
  });

  it("closes with the explicit close control", () => {
    render(<LotCard lot={lot} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver 2 mercadorias do lote 59" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar mercadorias" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
