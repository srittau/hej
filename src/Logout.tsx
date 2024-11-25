import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActionIcon } from "@mantine/core";
import { useSubmit } from "react-router";

interface LogoutProps {
  ml?: string;
}

export default function Logout({ ml }: LogoutProps) {
  const submit = useSubmit();

  return (
    <ActionIcon
      variant="outline"
      title="Logout"
      aria-label="Logout"
      size="lg"
      ml={ml}
      onClick={() =>
        void submit(null, {
          method: "post",
          action: "/logout",
        })
      }
    >
      <FontAwesomeIcon icon={faRightFromBracket} />
    </ActionIcon>
  );
}
