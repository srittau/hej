import { StrictMode } from "react";

import LoginPage from "./LoginPage";
import Router from "./Router";
import { useAuthCookie } from "./auth";

export default function App() {
  const cookie = useAuthCookie();
  return <StrictMode>{!cookie ? <LoginPage /> : <Router />}</StrictMode>;
}
