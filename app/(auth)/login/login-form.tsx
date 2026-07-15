"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthRole } from "@/lib/auth/types";
import { useAuthStore } from "@/store/useAuthStore";

interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      username: string;
      role: AuthRole;
    };
  };
  error?: {
    message: string;
  };
}

interface LoginFormValues {
  username: string;
  password: string;
}

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFinish(values: LoginFormValues) {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(result.error?.message ?? "登录失败，请稍后重试。");
        return;
      }

      setUser({
        adminId: result.data.user.id,
        username: result.data.user.username,
        role: result.data.user.role,
      });

      router.replace(nextPath || "/dashboard");
    } catch {
      setErrorMessage("登录请求失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>系统登录</Typography.Title>
        <Typography.Paragraph type="secondary">
          使用管理员账号登录后进入业务后台。
        </Typography.Paragraph>

        {errorMessage ? (
          <Alert
            style={{ marginBottom: 16 }}
            type="error"
            showIcon
            title={errorMessage}
          />
        ) : null}

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名长度至少 3 位" },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 8, message: "密码长度至少 8 位" },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Button loading={submitting} type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}
