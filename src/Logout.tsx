import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActionIcon } from "@mantine/core";

import { unsetAuthCookie } from "./auth";
import { useLogout } from "./gql";

interface LogoutProps {
  ml?: string;
}

export default function Logout({ ml }: LogoutProps) {
  const sendLogout = useLogout();

  function logout() {
    sendLogout();
    unsetAuthCookie();
  }

  return (
    <ActionIcon
      variant="outline"
      title="Logout"
      aria-label="Logout"
      size="lg"
      ml={ml}
      onClick={logout}
    >
      <FontAwesomeIcon icon={faRightFromBracket} />
    </ActionIcon>
  );
}
