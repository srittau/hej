import { Burger, Group, Image, Title } from "@mantine/core";

import classes from "./Header.module.css";

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export default function Header({ opened, toggle }: HeaderProps) {
  return (
    <Group p="xs" className={classes.header}>
      <Burger opened={opened} onClick={toggle} />
      <Image src="/hej.png" className={classes.logo} />
      <Title size="h2">Hej</Title>
    </Group>
  );
}
