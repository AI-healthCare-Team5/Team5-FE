export function formatRecordDate(createdAt: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(createdAt))
    .replaceAll("-", ".");
}
