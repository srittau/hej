import { vi } from "vitest";

vi.mock("awesome-graphql-client", () => {
  const AwesomeGraphQLClient = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  AwesomeGraphQLClient.prototype.request = vi.fn();
  return { AwesomeGraphQLClient, gql: vi.fn() };
});
