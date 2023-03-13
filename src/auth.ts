import { useEffect, useState } from "react";

const COOKIE_NAME = "HejSessionKey";

export function useAuthCookie(): string | undefined {
  const [cookie, setCookie] = useState(getCookieValue(COOKIE_NAME));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCookie(getCookieValue(COOKIE_NAME));
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return cookie;
}

function getCookieValue(cookieName: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.split("=")[1];
}

export function setAuthCookie(value: string): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}`;
}

export function unsetAuthCookie(): void {
  document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:01 GMT`;
}
