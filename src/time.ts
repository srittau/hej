export function formatDate(dt: string): string {
  return dt.slice(0, 10);
}

export function formatDateTime(dt: string): string {
  return dt.slice(0, 16).replace("T", " ");
}
