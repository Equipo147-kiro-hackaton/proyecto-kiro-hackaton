/**
 * Validates a username string.
 * Valid usernames contain only alphanumeric characters and underscores,
 * with a length between 3 and 20 characters (inclusive).
 */
export function validateUsername(s: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(s);
}
