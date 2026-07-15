"use client";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface AccountItem {
  id: string;
  username: string;
  role: "super" | "admin" | "teacher";
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
}

interface AccountListResponse {
  success: boolean;
  data?: {
    items: AccountItem[];
  };
  error?: {
    message: string;
  };
}

interface CreateAccountValues {
  username: string;
  password: string;
  role: "admin" | "teacher";
}

export default function AdminAccountsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AccountItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [form] = Form.useForm<CreateAccountValues>();

  async function loadAccounts() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/accounts", { credentials: "include" });
      const result = (await response.json()) as AccountListResponse;

      if (!response.ok || !result.success || !result.data) {
        message.error(result.error?.message ?? "加载账号失败");
        return;
      }

      setRows(result.data.items);
    } catch {
      message.error("加载账号失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAccount(values: CreateAccountValues) {
    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as { success: boolean; error?: { message: string } };

      if (!response.ok || !result.success) {
        message.error(result.error?.message ?? "创建账号失败");
        return;
      }

      message.success("账号创建成功");
      setCreateOpen(false);
      form.resetFields();
      await loadAccounts();
    } catch {
      message.error("创建账号失败，请稍后重试");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function toggleAccountStatus(id: string, status: "active" | "disabled") {
    const nextStatus = status === "active" ? "disabled" : "active";

    const response = await fetch(`/api/admin/accounts/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: nextStatus }),
    });

    const result = (await response.json()) as { success: boolean; error?: { message: string } };

    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "状态更新失败");
      return;
    }

    message.success(nextStatus === "disabled" ? "账号已禁用" : "账号已启用");
    await loadAccounts();
  }

  async function resetPassword(id: string) {
    const defaultPassword = Math.random().toString(36).slice(-10) + "A1";

    const response = await fetch(`/api/admin/accounts/${id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword: defaultPassword }),
    });

    const result = (await response.json()) as { success: boolean; error?: { message: string } };

    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "重置密码失败");
      return;
    }

    Modal.info({
      title: "密码已重置",
      content: `新密码：${defaultPassword}`,
    });
    await loadAccounts();
  }

  const columns: ColumnsType<AccountItem> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (role: AccountItem["role"]) => (
        <Tag color={role === "admin" ? "blue" : "green"}>{role}</Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: AccountItem["status"]) => (
        <Tag color={status === "active" ? "success" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={record.status === "active" ? "确认禁用该账号？" : "确认启用该账号？"}
            onConfirm={() => void toggleAccountStatus(record.id, record.status)}
          >
            <Button size="small">{record.status === "active" ? "禁用" : "启用"}</Button>
          </Popconfirm>
          <Popconfirm title="确认重置该账号密码？" onConfirm={() => void resetPassword(record.id)}>
            <Button size="small">重置密码</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Typography.Title level={4} style={{ marginBottom: 4 }}>
              管理员账号
            </Typography.Title>
            <Typography.Text type="secondary">
              仅 super 角色可创建、禁用、重置 admin/teacher 账号。
            </Typography.Text>
          </div>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新增账号
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<AccountItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        open={createOpen}
        title="新增子账号"
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createSubmitting}
      >
        <Form<CreateAccountValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void createAccount(values)}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "长度至少 3 位" },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 8, message: "长度至少 8 位" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: "请选择角色" }]}
            initialValue="teacher"
          >
            <Select
              options={[
                { value: "admin", label: "admin" },
                { value: "teacher", label: "teacher" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
