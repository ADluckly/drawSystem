"use client";

import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

interface TeacherOption {
  id: string;
  username: string;
}

interface CourseItem {
  id: string;
  name: string;
  category: string;
  lessonCount: number;
  giftLesson: number;
  amount: number;
  expireDays: number;
  note: string;
  status: "active" | "inactive";
}

interface ClassItem {
  id: string;
  name: string;
  code: string;
  teacherId: string | null;
  teacherName: string | null;
  note: string;
  status: "active" | "inactive";
  studentCount: number;
}

interface SystemSettings {
  defaultWarningThreshold: number;
  exportMaxRecords: number;
  exportMaxDays: number;
}

export default function SettingsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courseForm] = Form.useForm<CourseItem>();
  const [classForm] = Form.useForm<ClassItem>();
  const [systemForm] = Form.useForm<SystemSettings>();

  async function loadAll() {
    setLoading(true);
    try {
      const [teachersRes, coursesRes, classesRes, settingsRes] = await Promise.all([
        fetch("/api/teachers/options", { credentials: "include" }),
        fetch("/api/courses?includeInactive=true", { credentials: "include" }),
        fetch("/api/classes?includeInactive=true", { credentials: "include" }),
        fetch("/api/settings/system", { credentials: "include" }),
      ]);

      const teachersJson = (await teachersRes.json()) as {
        success: boolean;
        data?: { items: TeacherOption[] };
      };
      const coursesJson = (await coursesRes.json()) as {
        success: boolean;
        data?: { items: CourseItem[] };
      };
      const classesJson = (await classesRes.json()) as {
        success: boolean;
        data?: { items: ClassItem[] };
      };
      const settingsJson = (await settingsRes.json()) as {
        success: boolean;
        data?: SystemSettings;
      };

      if (teachersJson.success && teachersJson.data) setTeachers(teachersJson.data.items);
      if (coursesJson.success && coursesJson.data) setCourses(coursesJson.data.items);
      if (classesJson.success && classesJson.data) setClasses(classesJson.data.items);
      if (settingsJson.success && settingsJson.data) systemForm.setFieldsValue(settingsJson.data);
    } catch {
      message.error("加载配置中心失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCourse(values: CourseItem) {
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "创建课程失败");
      return;
    }
    courseForm.resetFields();
    message.success("课程已创建");
    await loadAll();
  }

  async function toggleCourseStatus(record: CourseItem, checked: boolean) {
    const response = await fetch(`/api/courses/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: checked ? "active" : "inactive" }),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "更新课程状态失败");
      return;
    }
    await loadAll();
  }

  async function createClass(values: ClassItem) {
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "创建班级失败");
      return;
    }
    classForm.resetFields();
    message.success("班级已创建");
    await loadAll();
  }

  async function updateClassTeacher(record: ClassItem, teacherId: string | null) {
    const response = await fetch(`/api/classes/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ teacherId }),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "更新班级教师失败");
      return;
    }
    await loadAll();
  }

  async function toggleClassStatus(record: ClassItem, checked: boolean) {
    const response = await fetch(`/api/classes/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: checked ? "active" : "inactive" }),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "更新班级状态失败");
      return;
    }
    await loadAll();
  }

  async function saveSystemSettings(values: SystemSettings) {
    const response = await fetch("/api/settings/system", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!response.ok || !result.success) {
      message.error(result.error?.message ?? "保存系统配置失败");
      return;
    }
    message.success("系统配置已保存并即时生效");
    await loadAll();
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Typography.Title level={3} style={{ margin: 0 }}>
          配置中心
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          维护课程分类、班级教师绑定与系统阈值。
        </Typography.Paragraph>
      </Card>

      <Tabs
        items={[
          {
            key: "courses",
            label: "课程配置",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card loading={loading}>
                  <Form form={courseForm} layout="vertical" onFinish={(values) => void createCourse(values)}>
                    <Row gutter={12}>
                      <Col xs={24} md={8}>
                        <Form.Item label="课程名称" name="name" rules={[{ required: true, message: "请输入课程名称" }]}> 
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="课程分类" name="category" rules={[{ required: true, message: "请输入分类" }]}> 
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="总课时" name="lessonCount" rules={[{ required: true, message: "请输入总课时" }]}> 
                          <InputNumber style={{ width: "100%" }} min={0} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col xs={24} md={6}>
                        <Form.Item label="赠送课时" name="giftLesson" initialValue={0}> 
                          <InputNumber style={{ width: "100%" }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="金额" name="amount" rules={[{ required: true, message: "请输入金额" }]}> 
                          <InputNumber style={{ width: "100%" }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="有效天数" name="expireDays" initialValue={365}> 
                          <InputNumber style={{ width: "100%" }} min={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="状态" name="status" initialValue="active"> 
                          <Select options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="备注" name="note">
                      <Input />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      新增课程
                    </Button>
                  </Form>
                </Card>
                <Card loading={loading}>
                  <Table
                    rowKey="id"
                    dataSource={courses}
                    pagination={false}
                    columns={[
                      { title: "名称", dataIndex: "name" },
                      { title: "分类", dataIndex: "category" },
                      { title: "课时", render: (_, row) => `${row.lessonCount}+${row.giftLesson}` },
                      { title: "金额", dataIndex: "amount" },
                      { title: "有效天数", dataIndex: "expireDays" },
                      { title: "备注", dataIndex: "note" },
                      {
                        title: "启用",
                        render: (_, row) => (
                          <Switch checked={row.status === "active"} onChange={(checked) => void toggleCourseStatus(row, checked)} />
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: "classes",
            label: "班级配置",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card loading={loading}>
                  <Form form={classForm} layout="vertical" onFinish={(values) => void createClass(values)}>
                    <Row gutter={12}>
                      <Col xs={24} md={8}>
                        <Form.Item label="班级名称" name="name" rules={[{ required: true, message: "请输入班级名称" }]}> 
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="班级编码" name="code" rules={[{ required: true, message: "请输入班级编码" }]}> 
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="绑定老师" name="teacherId">
                          <Select
                            allowClear
                            options={teachers.map((item) => ({ label: item.username, value: item.id }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item label="备注" name="note">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="状态" name="status" initialValue="active"> 
                          <Select options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button type="primary" htmlType="submit">
                      新增班级
                    </Button>
                  </Form>
                </Card>
                <Card loading={loading}>
                  <Table
                    rowKey="id"
                    dataSource={classes}
                    pagination={false}
                    columns={[
                      { title: "名称", dataIndex: "name" },
                      { title: "编码", dataIndex: "code" },
                      { title: "学员数", dataIndex: "studentCount" },
                      {
                        title: "绑定老师",
                        render: (_, row) => (
                          <Select
                            allowClear
                            style={{ width: 180 }}
                            value={row.teacherId ?? undefined}
                            options={teachers.map((item) => ({ label: item.username, value: item.id }))}
                            onChange={(value) => void updateClassTeacher(row, value ?? null)}
                          />
                        ),
                      },
                      { title: "备注", dataIndex: "note" },
                      {
                        title: "启用",
                        render: (_, row) => (
                          <Switch checked={row.status === "active"} onChange={(checked) => void toggleClassStatus(row, checked)} />
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: "system",
            label: "系统阈值",
            children: (
              <Card loading={loading}>
                <Form form={systemForm} layout="vertical" onFinish={(values) => void saveSystemSettings(values)}>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="默认预警阈值"
                        name="defaultWarningThreshold"
                        rules={[{ required: true, message: "请输入默认预警阈值" }]}
                      >
                        <InputNumber style={{ width: "100%" }} min={1} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="导出最大记录数"
                        name="exportMaxRecords"
                        rules={[{ required: true, message: "请输入导出最大记录数" }]}
                      >
                        <InputNumber style={{ width: "100%" }} min={100} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="导出最大天数"
                        name="exportMaxDays"
                        rules={[{ required: true, message: "请输入导出最大天数" }]}
                      >
                        <InputNumber style={{ width: "100%" }} min={1} max={366} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit">
                    保存系统配置
                  </Button>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </Space>
  );
}