import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActionIcon, Affix } from "@mantine/core";
import { useContext } from "react";
import { Link } from "react-router-dom";

import AppContext from "./AppContext";

interface AppLinkActionProps {
  icon: IconDefinition;
  to: string;
  replace?: boolean;
}

export default function AppLinkAction({
  to,
  icon,
  replace,
}: AppLinkActionProps) {
  const { sidebarOpened } = useContext(AppContext);
  return (
    <Affix bottom={20} right={20} hidden={sidebarOpened}>
      <Link to={to} replace={replace}>
        <ActionIcon size="xl" radius="xl">
          <FontAwesomeIcon icon={icon} />
        </ActionIcon>
      </Link>
    </Affix>
  );
}
