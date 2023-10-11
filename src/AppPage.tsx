import { AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";

import NavBar from "./NavBar";

export default function AppPage() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: { base: 40, sm: 1 } }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header hiddenFrom="md">
        <Burger opened={opened} onClick={toggle} />
      </AppShell.Header>
      <AppShell.Navbar>
        <NavBar onClose={toggle} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
