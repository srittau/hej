import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";

import AppContext from "./AppContext";
import Header from "./Header";
import NavBar from "./NavBar";

export default function AppPage() {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppContext.Provider value={{ sidebarOpened: opened }}>
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
    </AppContext.Provider>
  );
}
