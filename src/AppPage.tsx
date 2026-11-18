import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router";

import AppContext from "./AppContext.tsx";
import Header from "./Header.tsx";
import NavBar from "./NavBar.tsx";

export default function AppPage() {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppContext value={{ sidebarOpened: opened }}>
      <AppShell
        header={{ height: { base: "54" } }}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Header opened={opened} toggle={toggle} />
        </AppShell.Header>
        <AppShell.Navbar>
          <NavBar onClose={close} />
        </AppShell.Navbar>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </AppContext>
  );
}
