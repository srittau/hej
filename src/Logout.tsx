import { unsetAuthCookie } from "./auth";
import { useLogout } from "./gql";

export default function Logout() {
  const sendLogout = useLogout();

  function logout() {
    sendLogout();
    unsetAuthCookie();
  }

  return (
    <div className="logout-button">
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
