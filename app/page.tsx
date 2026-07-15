"use client";

import { Card, Col, Row, Space, Typography } from "antd";

export default function Home() {
  return (
    <div className="page-layout">
      <header className="page-header">
        <Typography.Title level={4} style={{ margin: 0, color: "#fff" }}>
          Drawing Training Check-in
        </Typography.Title>
      </header>
      <main className="page-content">
        <Space orientation="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Phase 0 基座已就绪
          </Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>
            当前工程已完成 Next.js 15、Ant Design、MongoDB 连接层、环境变量校验与基础目录搭建，可继续进入 Phase 1 鉴权与 RBAC 开发。
          </Typography.Paragraph>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title="App Router" variant="borderless">
                基于 Next.js 15 App Router，支持后续 API Route 与页面模块化扩展。
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Env Guard" variant="borderless">
                启动时自动校验关键配置，缺失 Mongo 或 JWT 配置会直接抛错阻断。
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Mongo Reuse" variant="borderless">
                开发热更新场景下复用连接缓存，避免重复创建连接导致告警。
              </Card>
            </Col>
          </Row>
        </Space>
      </main>
    </div>
  );
}
