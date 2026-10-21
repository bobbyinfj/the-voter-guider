// Election dates are stored as midnight UTC on election day; format them in UTC so
// they don't shift to the previous day in US time zones.
export function formatElectionDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" },
): string {
  return new Date(date).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
