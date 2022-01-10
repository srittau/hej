import { unsetAuthCookie } from "./auth";

export default function Logout() {
  return (
    <div className="logout-button">
      <button type="button" onClick={() => unsetAuthCookie()}>
        Logout
      </button>
    </div>
  );
}
