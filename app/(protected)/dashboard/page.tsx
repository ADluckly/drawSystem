"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";

import { LessonWarningCard } from "@/components/business/lesson-warning-card";

export default function DashboardPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        仪表盘
      </Typography.Title>
      <Typography.Paragraph>
        你已登录系统。当前页面用于验证鉴权、角色菜单与登录态持久化链路。
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="待签到学员" value={0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="今日已签到" value={0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="待处理充值" value={0} />
          </Card>
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <LessonWarningCard />
      </div>
    </div>
  );
}
