import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom"; // Importa le estensioni di jest-dom
import Home from "../base/Home"; // Assicurati che il path sia corretto

describe("Home component", () => {
  it("renders the logo image", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const logo = screen.getByRole("img"); // Cerca un'immagine nel DOM
    expect(logo).toBeInTheDocument(); // ✅ Ora funziona!
  });

  it("renders the 'Create a chat' button", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const createChatButton = screen.getByRole("button", { name: /create a chat/i });
    expect(createChatButton).toBeInTheDocument(); // ✅ Ora funziona!
  });
});
