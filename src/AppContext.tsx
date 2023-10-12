import { createContext } from "react";

interface AppContextValue {
  sidebarOpened: boolean;
}

const AppContext = createContext<AppContextValue>({ sidebarOpened: false });

export default AppContext;
