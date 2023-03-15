import React, { useState } from "react";

import { useLogin } from "./gql";

import "./LoginPage.css";

export default function LoginPage() {
  const [loginStatus, login] = useLogin();
  const [password, setPassword] = useState("");

  function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    login(password);
  }

  return (
    <div className="login-page">
      <form onSubmit={onSubmit}>
        <div>
          Passwort:{" "}
          <input
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
          />{" "}
          {loginStatus === "wrong-password" && (
            <span className="login-error">wrong password</span>
          )}
        </div>
        <div>
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  );
}
