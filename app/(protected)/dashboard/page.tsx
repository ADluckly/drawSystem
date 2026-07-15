"use client";

import { App, Card, Col, DatePicker, List, Row, Segmented, Space, Spin, Statistic, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";

import { LessonWarningCard } from "@/components/business/lesson-warning-card";

interface DashboardStatsData {
  range: "day" | "month";
  fromDate: string;
  toDate: string;
  summary: {
    revenue: number;
    consumedLessons: number;
    newStudents: number;
    renewals: number;
    warnings: number;
  };
  paymentBreakdown: Array<{
    paymentMethod: string;
    amount: number;
  }>;
}

export default function DashboardPage() {
  const { message } = App.useApp();
  const [range, setRange] = useState<"day" | "month">("month");
  const [anchorDate, setAnchorDate] = useState<Dayjs>(dayjs());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  async function loadStats(nextRange = range, nextDate = anchorDate) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/stats?range=${nextRange}&date=${nextDate.format("YYYY-MM-DD")}`,
        { credentials: "include" },
      );
      const result = (await response.json()) as { success: boolean; data?: DashboardStatsData };

      if (!response.ok || !result.success || !result.data) {
        message.error("加载统计看板失败");
        return;
      }

      setStats(result.data);
    } catch {
      message.error("加载统计看板失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, anchorDate]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              仪表盘
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              查看营收、消课、新增、续费和预警等核心运营指标。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Segmented
              value={range}
              onChange={(value) => setRange(value as "day" | "month")}
              options={[
                { label: "按日", value: "day" },
                { label: "按月", value: "month" },
              ]}
            />
            <DatePicker
              picker={range === "day" ? "date" : "month"}
              value={anchorDate}
              onChange={(value) => setAnchorDate(value ?? dayjs())}
            />
          </Space>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic title="营收" value={stats?.summary.revenue ?? 0} prefix="¥" precision={2} />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic title="消课" value={stats?.summary.consumedLessons ?? 0} suffix="课时" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic title="新增学员" value={stats?.summary.newStudents ?? 0} suffix="人" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic title="续费学员" value={stats?.summary.renewals ?? 0} suffix="人" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic title="低课时预警" value={stats?.summary.warnings ?? 0} suffix="人" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Card>
              <Statistic
                title="统计窗口"
                value={`${stats?.fromDate ?? dayjs(anchorDate).format("YYYY-MM-DD")} ~ ${stats?.toDate ?? dayjs(anchorDate).format("YYYY-MM-DD")}`}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Card title="收款方式分布">
        <List
          locale={{ emptyText: "当前统计窗口暂无充值数据" }}
          dataSource={stats?.paymentBreakdown ?? []}
          renderItem={(item) => (
            <List.Item>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Text>{item.paymentMethod}</Typography.Text>
                <Typography.Text strong>¥{item.amount.toFixed(2)}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <div>
        <LessonWarningCard />
      </div>
    </Space>
  );
}
