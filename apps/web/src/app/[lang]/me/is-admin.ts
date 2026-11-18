"use server";

// Whether the browser asking is signed in as an Admin (#192), for Me's link to
// the admin area: Me is prerendered, so it asks once it runs in the browser.

import { currentAccess } from "@/admin/access";

export async function signedInAsAdmin(): Promise<boolean> {
  return (await currentAccess()).kind === "admin";
}
