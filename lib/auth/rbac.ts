import type { AuthRole } from "@/lib/auth/types";

export const ROLE_ACCESS_MATRIX = {
  super: ["/dashboard", "/admin/accounts"],
  admin: ["/dashboard"],
  teacher: ["/dashboard"],
} as const;

export const ROUTE_ROLE_RULES: Array<{ prefix: string; allow: AuthRole[] }> = [
  { prefix: "/dashboard", allow: ["super", "admin", "teacher"] },
  { prefix: "/admin", allow: ["super"] },
];

export interface MenuItemConfig {
  key: string;
  label: string;
  path: string;
  allow: AuthRole[];
}

export const AUTH_MENU_ITEMS: MenuItemConfig[] = [
  {
    key: "dashboard",
    label: "仪表盘",
    path: "/dashboard",
    allow: ["super", "admin", "teacher"],
  },
  {
    key: "admin-accounts",
    label: "账号管理",
    path: "/admin/accounts",
    allow: ["super"],
  },
];

export function canAccessPath(pathname: string, role: AuthRole) {
  const matched = ROUTE_ROLE_RULES.find((rule) => pathname.startsWith(rule.prefix));
  if (!matched) {
    return true;
  }

  return matched.allow.includes(role);
}

export function filterMenuByRole(role: AuthRole) {
  return AUTH_MENU_ITEMS.filter((item) => item.allow.includes(role));
}
