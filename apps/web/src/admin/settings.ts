// The Admin allow-list (#42, #67), read from the environment on every request,
// never at build time, so a change to it applies at once. Admin is a role an
// Account holds: the Account's verified email is on ADMIN_ALLOW_LIST.
// docs/admin-setup.md lists the admin area's settings.

/** An email address as the allow-list and Accounts compare it. */
export const normalEmail = (email: string) => email.trim().toLowerCase();

/** The Admin allow-list: ADMIN_ALLOW_LIST, comma-separated verified email addresses. */
function adminAllowList(): string[] {
  return (process.env.ADMIN_ALLOW_LIST ?? "").split(",").map(normalEmail).filter(Boolean);
}

/** Whether the Account with this verified email is an Admin. */
export const isAdmin = (email: string) => adminAllowList().includes(normalEmail(email));
