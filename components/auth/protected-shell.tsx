"use client";

import { Button, Layout, Menu, Space, Tag, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { filterMenuByRole } from "@/lib/auth/rbac";
import type { AuthSession } from "@/lib/auth/types";
import { useAuthStore } from "@/store/useAuthStore";

interface ProtectedShellProps extends PropsWithChildren {
  session: AuthSession;
}

export function ProtectedShell({ session, children }: ProtectedShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clearUser = useAuthStore((state) => state.clearUser);

  const menuItems = useMemo(
    () =>
      filterMenuByRole(session.role).map((item) => ({
        key: item.path,
        label: item.label,
      })),
    [session.role],
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    clearUser();
    router.replace("/login");
  }

  return (
    <Layout className="app-shell">
      <Layout.Sider width={240} breakpoint="lg" collapsedWidth={0}>
        <div className="app-shell-logo">Drawing Check-in</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={(item) => router.push(item.key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-shell-header">
          <Space align="center" size={12}>
            <Typography.Text strong>{session.username}</Typography.Text>
            <Tag color="blue">{session.role}</Tag>
            <Button onClick={handleLogout}>退出登录</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="app-shell-content">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
