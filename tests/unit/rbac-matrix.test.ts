import { describe, expect, it } from "vitest";

import { canAccessPath, filterMenuByRole } from "@/lib/auth/rbac";

describe("rbac-matrix", () => {
  it("allows expected route access by role", () => {
    expect(canAccessPath("/students", "teacher")).toBe(true);
    expect(canAccessPath("/recharges", "teacher")).toBe(false);
    expect(canAccessPath("/recharges", "admin")).toBe(true);
    expect(canAccessPath("/admin/accounts", "admin")).toBe(false);
    expect(canAccessPath("/admin/accounts", "super")).toBe(true);
  });

  it("filters menu by role", () => {
    const teacherMenu = filterMenuByRole("teacher");
    const adminMenu = filterMenuByRole("admin");

    expect(teacherMenu.some((item) => item.path === "/students")).toBe(true);
    expect(teacherMenu.some((item) => item.path === "/recharges")).toBe(false);
    expect(adminMenu.some((item) => item.path === "/recharges")).toBe(true);
  });
});
