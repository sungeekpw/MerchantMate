import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * @param value - Raw phone number input
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format based on length
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

/**
 * Strips formatting from phone number to get raw digits
 * @param value - Formatted phone number
 * @returns Raw digits only
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formats an EIN/Tax ID to XX-XXXXXXX format
 * @param value - Raw EIN input
 * @returns Formatted EIN string
 */
export function formatEIN(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 9 digits
  const limited = digits.slice(0, 9);
  
  // Format based on length: XX-XXXXXXX
  if (limited.length <= 2) {
    return limited;
  } else {
    return `${limited.slice(0, 2)}-${limited.slice(2)}`;
  }
}

/**
 * Strips formatting from EIN to get raw digits
 * @param value - Formatted EIN
 * @returns Raw digits only
 */
export function unformatEIN(value: string): string {
  return value.replace(/\D/g, '');
}
