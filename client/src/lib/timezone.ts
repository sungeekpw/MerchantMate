import { format, formatInTimeZone } from "date-fns-tz";

/**
 * Get the user's detected timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn("Failed to detect timezone, falling back to UTC:", error);
    return "UTC";
  }
}

/**
 * Format a date in the user's timezone
 */
export function formatDateInUserTimezone(
  date: Date | string | null,
  formatStr: string = "MMM dd, yyyy 'at' hh:mm a",
  timezone?: string
): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const tz = timezone || getUserTimezone();
    return formatInTimeZone(dateObj, tz, formatStr);
  } catch (error) {
    console.warn("Failed to format date in timezone:", error);
    return format(typeof date === "string" ? new Date(date) : date, formatStr);
  }
}

/**
 * Get timezone abbreviation for display
 */
export function getTimezoneAbbreviation(timezone?: string): string {
  try {
    const tz = timezone || getUserTimezone();
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
      timeZone: tz,
    });
    
    const parts = formatter.formatToParts(now);
    const timeZonePart = parts.find(part => part.type === "timeZoneName");
    return timeZonePart?.value || tz;
  } catch (error) {
    return timezone || "UTC";
  }
}

/**
 * Convert UTC timestamp to user's local timezone
 */
export function convertToUserTimezone(utcDate: Date | string | null, timezone?: string): Date | null {
  if (!utcDate) return null;
  
  try {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    // The Date object automatically handles timezone conversion when displayed
    return date;
  } catch (error) {
    console.warn("Failed to convert timezone:", error);
    return null;
  }
}