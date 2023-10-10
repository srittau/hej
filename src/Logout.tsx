import { Button } from "@mantine/core";

import { unsetAuthCookie } from "./auth";
import { useLogout } from "./gql";

export default function Logout() {
  const sendLogout = useLogout();

  function logout() {
    sendLogout();
    unsetAuthCookie();
  }

  return (
    <Button type="button" variant="light" onClick={logout}>
      Logout
    </Button>
  );
}
