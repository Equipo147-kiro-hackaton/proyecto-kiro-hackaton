/**
 * Validates a username against the accepted character set and length.
 * Valid usernames contain only alphanumeric characters and underscores,
 * with a length between 3 and 20 characters (inclusive).
 */
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}
