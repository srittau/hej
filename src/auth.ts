const COOKIE_NAME = "HejSessionKey";

export function isLoggedIn(): boolean {
  return getCookieValue(COOKIE_NAME) !== undefined;
}

function getCookieValue(cookieName: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.split("=")[1];
}

export function setAuthCookie(value: string): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/`;
}

export function unsetAuthCookie(): void {
  document.cookie = `${COOKIE_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`;
}
