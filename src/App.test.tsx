import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders add note button", () => {
  render(<App />);
  const linkElement = screen.getByRole("button", { name: "Add note" });
  expect(linkElement).toBeInTheDocument();
});
