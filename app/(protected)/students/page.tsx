"use client";

import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface StudentItem {
  id: string;
  name: string;
  mobile: string;
  gender: "male" | "female" | "other";
  classInfo: { id: string; name: string; code: string } | null;
  status: "active" | "inactive";
  lessonTotal: number;
  lessonUsed: number;
  lessonLeft: number;
  lessonGift: number;
  lessonExpireAt: string | null;
  warningThreshold: number;
  createdAt: string;
}

interface StudentDetailResponse {
  success: boolean;
  data?: {
    student: StudentItem & { note: string };
    recharges: Array<{
      id: string;
      serialNo: string;
      packageName: string;
      lessonAdded: number;
      giftAdded: number;
      amount: number;
      paymentMethod: string;
      note: string;
      createdAt: string;
    }>;
    signs: Array<{
      id: string;
      signDate: string;
      signDateKey: string;
      action: "attend" | "leave";
      lessonCost: number;
      note: string;
      createdAt: string;
    }>;
  };
}

interface StudentCreateValues {
  name: string;
  mobile: string;
  gender: "male" | "female" | "other";
  classId?: string;
  warningThreshold: number;
  note?: string;
}

export default function StudentsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StudentItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [lessonStatus, setLessonStatus] = useState<"all" | "low" | "normal">("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<StudentDetailResponse["data"] | null>(null);
  const [form] = Form.useForm<StudentCreateValues>();

  async function loadStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "active" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (lessonStatus !== "all") params.set("lessonStatus", lessonStatus);

      const response = await fetch(`/api/students?${params.toString()}`, { credentials: "include" });
      const result = (await response.json()) as { success: boolean; data?: { items: StudentItem[] } };

      if (!response.ok || !result.success || !result.data) {
        message.error("加载学员失败");
        return;
      }

      setItems(result.data.items);
    } catch {
      message.error("加载学员失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(studentId: string) {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}`, { credentials: "include" });
      const result = (await response.json()) as StudentDetailResponse;

      if (!response.ok || !result.success || !result.data) {
        message.error("加载学员详情失败");
        return;
      }

      setDetailData(result.data);
      setDetailOpen(true);
    } catch {
      message.error("加载学员详情失败");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonStatus]);

  async function createStudent(values: StudentCreateValues) {
    setCreateLoading(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as { success: boolean; error?: { message: string } };

      if (!response.ok || !result.success) {
        message.error(result.error?.message ?? "新增学员失败");
        return;
      }

      message.success("新增学员成功");
      setCreateOpen(false);
      form.resetFields();
      await loadStudents();
    } catch {
      message.error("新增学员失败");
    } finally {
      setCreateLoading(false);
    }
  }

  const columns: ColumnsType<StudentItem> = [
    { title: "姓名", dataIndex: "name", key: "name" },
    { title: "手机号", dataIndex: "mobile", key: "mobile" },
    {
      title: "班级",
      key: "class",
      render: (_, record) => record.classInfo?.name ?? "-",
    },
    {
      title: "课时",
      key: "lesson",
      render: (_, record) => `${record.lessonLeft}/${record.lessonTotal}`,
    },
    {
      title: "预警",
      key: "warning",
      render: (_, record) =>
        record.lessonLeft <= record.warningThreshold ? <Tag color="red">低课时</Tag> : "-",
    },
    {
      title: "到期",
      key: "expire",
      render: (_, record) =>
        record.lessonExpireAt ? dayjs(record.lessonExpireAt).format("YYYY-MM-DD") : "-",
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Button size="small" onClick={() => void loadDetail(record.id)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            学员管理
          </Typography.Title>
          <Space>
            <Input.Search
              placeholder="按姓名搜索"
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={() => void loadStudents()}
              style={{ width: 220 }}
            />
            <Select
              value={lessonStatus}
              style={{ width: 160 }}
              onChange={(value) => setLessonStatus(value)}
              options={[
                { value: "all", label: "全部课时状态" },
                { value: "low", label: "低课时" },
                { value: "normal", label: "正常课时" },
              ]}
            />
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新增学员
            </Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <Table<StudentItem> rowKey="id" loading={loading} columns={columns} dataSource={items} />
      </Card>

      <Modal
        title="新增学员"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createLoading}
      >
        <Form<StudentCreateValues>
          form={form}
          layout="vertical"
          initialValues={{ gender: "other", warningThreshold: 3 }}
          onFinish={(values) => void createStudent(values)}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="手机号"
                name="mobile"
                rules={[{ required: true, message: "请输入手机号" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="性别" name="gender">
                <Select
                  options={[
                    { value: "male", label: "男" },
                    { value: "female", label: "女" },
                    { value: "other", label: "其他" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预警阈值" name="warningThreshold">
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="学员详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={720}
        loading={detailLoading}
      >
        {detailData ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="姓名">{detailData.student.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detailData.student.mobile}</Descriptions.Item>
              <Descriptions.Item label="课时总量">{detailData.student.lessonTotal}</Descriptions.Item>
              <Descriptions.Item label="已用课时">{detailData.student.lessonUsed}</Descriptions.Item>
              <Descriptions.Item label="剩余课时">{detailData.student.lessonLeft}</Descriptions.Item>
              <Descriptions.Item label="赠送课时">{detailData.student.lessonGift}</Descriptions.Item>
            </Descriptions>

            <Card title="充值历史">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detailData.recharges}
                columns={[
                  { title: "流水号", dataIndex: "serialNo" },
                  { title: "套餐", dataIndex: "packageName" },
                  { title: "课时+赠送", render: (_, r) => `${r.lessonAdded}+${r.giftAdded}` },
                  { title: "金额", dataIndex: "amount" },
                  {
                    title: "时间",
                    dataIndex: "createdAt",
                    render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm"),
                  },
                ]}
              />
            </Card>

            <Card title="打卡历史">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detailData.signs}
                columns={[
                  { title: "日期", dataIndex: "signDateKey" },
                  { title: "动作", dataIndex: "action" },
                  { title: "扣课", dataIndex: "lessonCost" },
                  { title: "备注", dataIndex: "note" },
                ]}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
