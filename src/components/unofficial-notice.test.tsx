import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnofficialNotice } from "./unofficial-notice";

describe("UnofficialNotice", () => {
  it("discloses independence and requires checking the official notice", () => {
    render(<UnofficialNotice />);
    expect(
      screen.getByRole("complementary", { name: "Aviso importante" }),
    ).toBeVisible();
    expect(screen.getByText(/não oficial e sem afiliação/)).toBeVisible();
    expect(
      screen.getByText(
        /Confira as informações no edital oficial antes de qualquer lance/,
      ),
    ).toBeVisible();
  });
});
