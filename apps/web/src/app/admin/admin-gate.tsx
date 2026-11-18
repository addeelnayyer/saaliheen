// Every admin page goes through this gate (#42): a visitor who isn't signed in
// is sent to the Sign-in page's Admin entry (#67), to come back to the page
// asked for; a signed-in person who isn't an Admin sees the "not an Admin"
// page, and only an Admin sees the page itself.

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentAccess } from "@/admin/access";
import { adminEntry } from "@/admin/admin-entry";
import { listSurahNamesNow } from "@/dataset/reader";
import { AdminFrame, NotAnAdmin } from "./admin-frame";

/** The admin page at `path` as `render` makes it for a signed-in Admin, or what anyone else gets in its place. */
export async function adminOnly(path: string, render: () => ReactNode | Promise<ReactNode>): Promise<ReactNode> {
  const access = await currentAccess();
  if (access.kind === "visitor") redirect(adminEntry(path));
  if (access.kind === "not-an-admin") return <NotAnAdmin email={access.email} />;
  return <AdminFrame email={access.email}>{await render()}</AdminFrame>;
}

/** The Surah an admin page's `[surah]` address names, as Neon holds it (#172); undefined when it names none. */
export const surahAt = async (address: string) =>
  /^\d{1,3}$/.test(address) ? (await listSurahNamesNow()).find((s) => s.number === Number(address)) : undefined;
