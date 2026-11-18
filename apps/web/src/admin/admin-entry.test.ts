// The Admin entry's way back (#67): a sign-in comes back to the admin page
// asked for, nested ones such as the Iltifat editor's (#142) included, and to
// /admin for anything else, so `?admin=` can never send the browser elsewhere.

import { describe, expect, it } from "vitest";
import { adminEntry, adminPageOrHome } from "./admin-entry";

describe("adminPageOrHome", () => {
  it.each(["/admin", "/admin/18", "/admin/iltifat", "/admin/iltifat/1", "/admin/iltifat/2-34"])("comes back to %s", (page) => {
    expect(adminPageOrHome(page)).toBe(page);
  });

  it.each([
    null,
    undefined,
    "",
    "/",
    "/en/1",
    "/administrator",
    "/admin/",
    "/admin//iltifat",
    "/admin/iltifat/",
    "//evil.example",
    "//evil.example/admin",
    "/\\evil.example",
    "/admin/../en/1",
    "/admin/iltifat/../../en",
    "/admin/./18",
    "/admin/%2e%2e/en",
    "/admin/%2F%2Fevil.example",
    "/admin\\iltifat",
    "/admin/18?next=//evil.example",
    "/admin/18#x",
    "/admin/ 18",
    "/admin/18\n",
    "https://evil.example/admin",
    "javascript:alert(1)",
    "admin/18",
  ])("refuses %j for /admin", (asked) => {
    expect(adminPageOrHome(asked)).toBe("/admin");
  });
});

describe("adminEntry", () => {
  it("names a nested admin page to come back to", () => {
    expect(adminEntry("/admin/iltifat/1")).toBe("/en/sign-in?admin=%2Fadmin%2Filtifat%2F1");
  });
});
