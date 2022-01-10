import AppPage from "./AppPage";
import { useAuthCookie } from "./auth";
import LoginPage from "./LoginPage";

export default function App() {
  const cookie = useAuthCookie();
  return cookie === undefined ? <LoginPage /> : <AppPage />;
}
