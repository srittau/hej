import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActionIcon } from "@mantine/core";

import { useLogout } from "./gql";

interface LogoutProps {
  ml?: string;
}

export default function Logout({ ml }: LogoutProps) {
  const sendLogout = useLogout();

  return (
    <ActionIcon
      variant="outline"
      title="Logout"
      aria-label="Logout"
      size="lg"
      ml={ml}
      onClick={() => sendLogout()}
    >
      <FontAwesomeIcon icon={faRightFromBracket} />
    </ActionIcon>
  );
}
