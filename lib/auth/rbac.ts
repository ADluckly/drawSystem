import type { AuthRole } from "@/lib/auth/types";

export const ROLE_ACCESS_MATRIX = {
  super: ["/dashboard", "/students", "/recharges", "/signs", "/admin/accounts"],
  admin: ["/dashboard", "/students", "/recharges", "/signs"],
  teacher: ["/dashboard", "/students", "/signs"],
} as const;

export const ROUTE_ROLE_RULES: Array<{ prefix: string; allow: AuthRole[] }> = [
  { prefix: "/dashboard", allow: ["super", "admin", "teacher"] },
  { prefix: "/students", allow: ["super", "admin", "teacher"] },
  { prefix: "/recharges", allow: ["super", "admin"] },
  { prefix: "/signs", allow: ["super", "admin", "teacher"] },
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
    key: "students",
    label: "学员管理",
    path: "/students",
    allow: ["super", "admin", "teacher"],
  },
  {
    key: "recharges",
    label: "充值管理",
    path: "/recharges",
    allow: ["super", "admin"],
  },
  {
    key: "signs",
    label: "打卡记录",
    path: "/signs",
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
