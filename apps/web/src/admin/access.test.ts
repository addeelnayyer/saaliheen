// Who a request is from (#42, #67, #170): a visitor with no session, a signed-in
// person who isn't an Admin (unverified, or not on the allow-list), or an Admin
// carrying their Account's id. The session is a stand-in for Better Auth's.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessOf } from "./access";

type User = { id: string; email: string; emailVerified: boolean; name: string };
let signedIn: User | undefined;
vi.mock("@/account/auth", () => ({
  getAuth: () => ({ api: { getSession: async () => (signedIn ? { user: signedIn } : null) } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const ADMIN: User = { id: "admin-account", email: "Admin@Example.com", emailVerified: true, name: "Admin" };

beforeEach(() => {
  vi.stubEnv("ADMIN_ALLOW_LIST", "admin@example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  signedIn = undefined;
});

describe("who a request is from", () => {
  it("is a visitor when no one is signed in", async () => {
    expect(await accessOf(new Headers())).toEqual({ kind: "visitor" });
  });

  it("is not an Admin when the Account's email is unverified", async () => {
    signedIn = { ...ADMIN, emailVerified: false };
    expect(await accessOf(new Headers())).toEqual({ kind: "not-an-admin", email: ADMIN.email });
  });

  it("is not an Admin when the Account's email is not on the allow-list", async () => {
    signedIn = { ...ADMIN, email: "reader@example.com" };
    expect(await accessOf(new Headers())).toEqual({ kind: "not-an-admin", email: "reader@example.com" });
  });

  it("is an Admin, with the Account's id, email and name", async () => {
    signedIn = ADMIN;
    expect(await accessOf(new Headers())).toEqual({ kind: "admin", id: "admin-account", email: ADMIN.email, name: "Admin" });
  });

  it("is an Admin with no name when the Account has none", async () => {
    signedIn = { ...ADMIN, name: "" };
    expect(await accessOf(new Headers())).toEqual({ kind: "admin", id: "admin-account", email: ADMIN.email, name: undefined });
  });
});
