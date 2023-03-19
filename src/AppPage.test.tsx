// Import mocks first
import "./graphql-request.mock";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import AppPage from "./AppPage";

test("renders add note button", () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AppPage />
    </QueryClientProvider>,
  );
  const linkElement = screen.getByRole("button", { name: "Add note" });
  expect(linkElement).toBeInTheDocument();
});
