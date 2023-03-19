import { vi } from "vitest";

vi.mock("graphql-request", () => {
  const GraphQLClient = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  GraphQLClient.prototype.request = vi.fn();
  return { GraphQLClient, gql: vi.fn() };
});
