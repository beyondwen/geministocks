const USER_ID_KEY = 'super-digger-user-id';

/**
 * Retrieves the unique user ID from localStorage, or creates and stores a new one.
 * This allows tracking payment status for anonymous users.
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
