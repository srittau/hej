import AppPage from "./AppPage";
import LoginPage from "./LoginPage";
import { useAuthCookie } from "./auth";

export default function App() {
  const cookie = useAuthCookie();
  return cookie === undefined ? <LoginPage /> : <AppPage />;
}
