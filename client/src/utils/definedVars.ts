// These variables are all defined by vite.config.ts.
// For whatever reason, they cannot be accessed within Vue files directly,
// so this module provides access to them.

export function getWebAppHost(): string {
  // @ts-ignore
  return webAppHost;
}
export function getArchiveUrl(): string {
  // @ts-ignore
  return archiveUrl;
}
export function getWebSocketUrl(): string {
  // @ts-ignore
  return webSocketUrl;
}
export function getContactEmail(): string {
  // @ts-ignore
  return contactEmail;
}
export function getContactUrl(): string {
  // @ts-ignore
  return contactUrl;
}
export function getContactIssuesUrl(): string {
  // @ts-ignore
  return contactIssuesUrl;
}
export function getContactProjectUrl(): string {
  // @ts-ignore
  return contactProjectUrl;
}
