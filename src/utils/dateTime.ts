function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a Date using local calendar components as YYYY-MM-DD. */
export function localDateIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Format a Date using local clock components as HH:mm. */
export function localTimeIso(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
