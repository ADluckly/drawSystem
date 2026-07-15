"use client";

import { App, Button, Card, Form, Input, InputNumber, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface RechargeItem {
  id: string;
  serialNo: string;
  student: { id: string; name: string; mobile: string } | null;
  packageName: string;
  lessonAdded: number;
  giftAdded: number;
  amount: number;
  paymentMethod: string;
  createdAt: string;
}

interface RechargeFormValues {
  studentId: string;
  packageName: string;
  lessonAdded: number;
  giftAdded: number;
  amount: number;
  paymentMethod: "cash" | "wechat" | "alipay" | "bank" | "other";
  note?: string;
}

export default function RechargesPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RechargeItem[]>([]);
  const [studentOptions, setStudentOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm<RechargeFormValues>();

  async function loadRecharges() {
    setLoading(true);
    try {
      const response = await fetch("/api/recharges", { credentials: "include" });
      const result = (await response.json()) as { success: boolean; data?: { items: RechargeItem[] } };
      if (!response.ok || !result.success || !result.data) {
        message.error("加载充值记录失败");
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

    setStudentOptions(
      result.data.items.map((item) => ({ label: `${item.name} (${item.mobile})`, value: item.id })),
    );
  }

  useEffect(() => {
    void loadRecharges();
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRecharge(values: RechargeFormValues) {
    setSubmitLoading(true);
    try {
      const response = await fetch("/api/recharges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as { success: boolean; error?: { message: string } };
      if (!response.ok || !result.success) {
        message.error(result.error?.message ?? "充值失败");
        return;
      }

      message.success("充值成功");
      form.resetFields();
      await loadRecharges();
    } finally {
      setSubmitLoading(false);
    }
  }

  const columns: ColumnsType<RechargeItem> = [
    { title: "流水号", dataIndex: "serialNo" },
    { title: "学员", render: (_, row) => (row.student ? row.student.name : "-") },
    { title: "套餐", dataIndex: "packageName" },
    { title: "课时", render: (_, row) => `${row.lessonAdded}+${row.giftAdded}` },
    { title: "金额", dataIndex: "amount" },
    { title: "支付方式", dataIndex: "paymentMethod" },
    { title: "时间", dataIndex: "createdAt", render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm") },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          充值管理
        </Typography.Title>
        <Form<RechargeFormValues>
          form={form}
          layout="inline"
          onFinish={(values) => void submitRecharge(values)}
          initialValues={{ giftAdded: 0, paymentMethod: "cash" }}
        >
          <Form.Item name="studentId" rules={[{ required: true, message: "请选择学员" }]}>
            <Select style={{ width: 240 }} options={studentOptions} placeholder="学员" showSearch />
          </Form.Item>
          <Form.Item name="packageName" rules={[{ required: true, message: "请输入套餐" }]}>
            <Input placeholder="套餐名" />
          </Form.Item>
          <Form.Item name="lessonAdded" rules={[{ required: true, message: "请输入课时" }]}>
            <InputNumber min={0} placeholder="课时" />
          </Form.Item>
          <Form.Item name="giftAdded">
            <InputNumber min={0} placeholder="赠送" />
          </Form.Item>
          <Form.Item name="amount" rules={[{ required: true, message: "请输入金额" }]}>
            <InputNumber min={0} placeholder="金额" />
          </Form.Item>
          <Form.Item name="paymentMethod" rules={[{ required: true, message: "支付方式" }]}>
            <Select
              style={{ width: 140 }}
              options={[
                { value: "cash", label: "cash" },
                { value: "wechat", label: "wechat" },
                { value: "alipay", label: "alipay" },
                { value: "bank", label: "bank" },
                { value: "other", label: "other" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note">
            <Input placeholder="备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              提交充值
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table<RechargeItem> rowKey="id" columns={columns} loading={loading} dataSource={items} />
      </Card>
    </Space>
  );
}
