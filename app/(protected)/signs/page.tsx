"use client";

import { App, Button, Card, DatePicker, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface SignItem {
  id: string;
  student: { id: string; name: string; mobile: string } | null;
  signDate: string;
  signDateKey: string;
  action: "attend" | "leave";
  lessonCost: number;
  note: string;
  createdAt: string;
}

interface SignFormValues {
  studentId: string;
  action: "attend" | "leave";
  signDate: dayjs.Dayjs;
  note?: string;
}

export default function SignsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<SignItem[]>([]);
  const [students, setStudents] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm<SignFormValues>();

  async function loadSigns() {
    setLoading(true);
    try {
      const response = await fetch("/api/signs", { credentials: "include" });
      const result = (await response.json()) as { success: boolean; data?: { items: SignItem[] } };
      if (!response.ok || !result.success || !result.data) {
        message.error("加载打卡记录失败");
        return;
      }
      setItems(result.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    const response = await fetch("/api/students?status=active", { credentials: "include" });
    const result = (await response.json()) as {
      success: boolean;
      data?: { items: Array<{ id: string; name: string; mobile: string }> };
    };
    if (!response.ok || !result.success || !result.data) return;

    setStudents(result.data.items.map((item) => ({ label: `${item.name} (${item.mobile})`, value: item.id })));
  }

  useEffect(() => {
    void loadSigns();
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitSign(values: SignFormValues) {
    setSubmitLoading(true);
    try {
      const response = await fetch("/api/signs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        credentials: "include",
        body: JSON.stringify({
          studentId: values.studentId,
          action: values.action,
          signDate: values.signDate.format("YYYY-MM-DD"),
          note: values.note,
        }),
      });

      const result = (await response.json()) as { success: boolean; error?: { message: string } };
      if (!response.ok || !result.success) {
        message.error(result.error?.message ?? "打卡失败");
        return;
      }

      message.success(values.action === "leave" ? "请假记录成功" : "打卡成功");
      form.resetFields();
      await loadSigns();
    } finally {
      setSubmitLoading(false);
    }
  }

  const columns: ColumnsType<SignItem> = [
    { title: "学员", render: (_, row) => row.student?.name ?? "-" },
    { title: "日期", dataIndex: "signDateKey" },
    {
      title: "动作",
      dataIndex: "action",
      render: (action: SignItem["action"]) =>
        action === "attend" ? <Tag color="blue">上课</Tag> : <Tag color="gold">请假</Tag>,
    },
    { title: "扣课", dataIndex: "lessonCost" },
    { title: "备注", dataIndex: "note" },
    { title: "记录时间", dataIndex: "createdAt", render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm") },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          单人打卡
        </Typography.Title>
        <Form<SignFormValues>
          form={form}
          layout="inline"
          initialValues={{ action: "attend", signDate: dayjs() }}
          onFinish={(values) => void submitSign(values)}
        >
          <Form.Item name="studentId" rules={[{ required: true, message: "请选择学员" }]}>
            <Select style={{ width: 240 }} options={students} placeholder="学员" showSearch />
          </Form.Item>
          <Form.Item name="action" rules={[{ required: true, message: "请选择动作" }]}>
            <Select
              style={{ width: 140 }}
              options={[
                { value: "attend", label: "正常上课" },
                { value: "leave", label: "请假" },
              ]}
            />
          </Form.Item>
          <Form.Item name="signDate" rules={[{ required: true, message: "请选择日期" }]}>
            <DatePicker />
          </Form.Item>
          <Form.Item name="note">
            <Input placeholder="备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table<SignItem> rowKey="id" loading={loading} columns={columns} dataSource={items} />
      </Card>
    </Space>
  );
}
