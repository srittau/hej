import { Burger, Group, Image } from "@mantine/core";

import classes from "./Header.module.css";
import Logout from "./Logout";

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export default function Header({ opened, toggle }: HeaderProps) {
  return (
    <Group p="xs" className={classes.header}>
      <Burger opened={opened} hiddenFrom="sm" onClick={toggle} />
      <Image src="/hej-logo.svg" className={classes.logo} />
      <Image src="/hej-name.svg" alt="Hej" className={classes.name} />
      <Logout ml="auto" />
    </Group>
  );
}
