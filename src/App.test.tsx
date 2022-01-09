import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import React from "react";

import App from "./App";

const client = new ApolloClient({ cache: new InMemoryCache() });

test("renders add note button", () => {
  render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
  );
  const linkElement = screen.getByRole("button", { name: "Add note" });
  expect(linkElement).toBeInTheDocument();
});
