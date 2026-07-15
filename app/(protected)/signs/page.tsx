"use client";

import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  List,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface SignItem {
  id: string;
  student: { id: string; name: string; mobile: string; className?: string | null } | null;
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

interface BatchSignValues {
  classId: string;
  studentIds?: string[];
  action: "attend" | "leave";
  signDate: dayjs.Dayjs;
  note?: string;
}

export default function SignsPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<SignItem[]>([]);
  const [students, setStudents] = useState<Array<{ label: string; value: string }>>([]);
  const [classOptions, setClassOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [batchStudents, setBatchStudents] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    totalCount: number;
    successCount: number;
    failureCount: number;
    failures: Array<{ studentId: string; studentName: string; code: string; message: string }>;
  } | null>(null);
  const [filterAction, setFilterAction] = useState<string | undefined>(undefined);
  const [filterClassId, setFilterClassId] = useState<string | undefined>(undefined);
  const [filterDate, setFilterDate] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [form] = Form.useForm<SignFormValues>();
  const [batchForm] = Form.useForm<BatchSignValues>();

  async function loadSigns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterClassId) params.set("classId", filterClassId);
      if (filterDate) {
        params.set("fromDate", filterDate[0].format("YYYY-MM-DD"));
        params.set("toDate", filterDate[1].format("YYYY-MM-DD"));
      }

      const response = await fetch(`/api/signs?${params.toString()}`, { credentials: "include" });
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

  async function loadClasses() {
    const response = await fetch("/api/classes", { credentials: "include" });
    const result = (await response.json()) as {
      success: boolean;
      data?: { items: Array<{ id: string; name: string; code: string }> };
    };
    if (!response.ok || !result.success || !result.data) return;

    setClassOptions(result.data.items.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id })));
  }

  async function loadBatchStudents(classId: string) {
    const response = await fetch(`/api/students?status=active&classId=${classId}`, { credentials: "include" });
    const result = (await response.json()) as {
      success: boolean;
      data?: { items: Array<{ id: string; name: string; mobile: string }> };
    };
    if (!response.ok || !result.success || !result.data) return;

    const options = result.data.items.map((item) => ({ label: `${item.name} (${item.mobile})`, value: item.id }));
    setBatchStudents(options);
    batchForm.setFieldValue(
      "studentIds",
      options.map((item) => item.value),
    );
  }

  useEffect(() => {
    void loadSigns();
    void loadStudents();
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterClassId, filterDate]);

  function exportSigns() {
    const params = new URLSearchParams();
    if (filterAction) params.set("action", filterAction);
    if (filterClassId) params.set("classId", filterClassId);
    if (filterDate) {
      params.set("fromDate", filterDate[0].format("YYYY-MM-DD"));
      params.set("toDate", filterDate[1].format("YYYY-MM-DD"));
    }
    window.open(`/api/exports/signs?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

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

  async function submitBatchSign(values: BatchSignValues) {
    setBatchLoading(true);
    try {
      const response = await fetch("/api/signs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        credentials: "include",
        body: JSON.stringify({
          classId: values.classId,
          studentIds: values.studentIds,
          action: values.action,
          signDate: values.signDate.format("YYYY-MM-DD"),
          note: values.note,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        data?: {
          totalCount: number;
          successCount: number;
          failureCount: number;
          failures: Array<{ studentId: string; studentName: string; code: string; message: string }>;
        };
        error?: { message: string };
      };

      if (!response.ok || !result.success || !result.data) {
        message.error(result.error?.message ?? "批量打卡失败");
        return;
      }

      setBatchResult(result.data);
      message.success(`批量完成：成功 ${result.data.successCount}，失败 ${result.data.failureCount}`);
      await loadSigns();
    } finally {
      setBatchLoading(false);
    }
  }

  const columns: ColumnsType<SignItem> = [
    { title: "学员", render: (_, row) => row.student?.name ?? "-" },
    { title: "班级", render: (_, row) => row.student?.className ?? "-" },
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
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
            打卡记录
          </Typography.Title>
          <Space wrap>
            <Select
              allowClear
              placeholder="按班级筛选"
              style={{ width: 220 }}
              options={classOptions}
              value={filterClassId}
              onChange={(value) => setFilterClassId(value)}
            />
            <Select
              allowClear
              placeholder="按动作筛选"
              style={{ width: 160 }}
              value={filterAction}
              onChange={(value) => setFilterAction(value)}
              options={[
                { value: "attend", label: "正常上课" },
                { value: "leave", label: "请假" },
              ]}
            />
            <DatePicker.RangePicker value={filterDate} onChange={(value) => setFilterDate(value as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            <Button onClick={exportSigns}>导出打卡</Button>
          </Space>
        </Space>
      </Card>

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
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          班级批量打卡
        </Typography.Title>
        <Form<BatchSignValues>
          form={batchForm}
          layout="vertical"
          initialValues={{ action: "attend", signDate: dayjs() }}
          onFinish={(values) => void submitBatchSign(values)}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space wrap style={{ width: "100%" }}>
              <Form.Item name="classId" label="班级" rules={[{ required: true, message: "请选择班级" }]}> 
                <Select
                  style={{ width: 240 }}
                  options={classOptions}
                  onChange={(value) => {
                    if (value) {
                      void loadBatchStudents(value);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="action" label="动作" rules={[{ required: true, message: "请选择动作" }]}> 
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: "attend", label: "正常上课" },
                    { value: "leave", label: "请假" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="signDate" label="日期" rules={[{ required: true, message: "请选择日期" }]}> 
                <DatePicker />
              </Form.Item>
            </Space>
            <Form.Item name="studentIds" label="学员范围">
              <Select mode="multiple" options={batchStudents} placeholder="默认全选当前班级有效学员" />
            </Form.Item>
            <Form.Item name="note" label="备注">
              <Input placeholder="可选" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={batchLoading}>
              提交批量打卡
            </Button>
          </Space>
        </Form>

        {batchResult ? (
          <Card size="small" style={{ marginTop: 16 }}>
            <Typography.Text>
              本次批量结果：总计 {batchResult.totalCount}，成功 {batchResult.successCount}，失败 {batchResult.failureCount}
            </Typography.Text>
            <List
              size="small"
              style={{ marginTop: 12 }}
              locale={{ emptyText: "无失败项" }}
              dataSource={batchResult.failures}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>
                    {item.studentName}：{item.message}
                  </Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        ) : null}
      </Card>

      <Card>
        <Table<SignItem> rowKey="id" loading={loading} columns={columns} dataSource={items} />
      </Card>
    </Space>
  );
}
