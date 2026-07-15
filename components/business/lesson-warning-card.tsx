"use client";

import { Alert, Card, Space, Typography } from "antd";
import { useEffect, useState } from "react";

interface WarningItem {
  id: string;
  name: string;
  mobile: string;
  lessonLeft: number;
  warningThreshold: number;
  className: string | null;
}

export function LessonWarningCard() {
  const [items, setItems] = useState<WarningItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadWarnings() {
      setLoading(true);
      try {
        const response = await fetch("/api/students/warnings", { credentials: "include" });
        const result = (await response.json()) as {
          success: boolean;
          data?: { items: WarningItem[] };
        };

        if (mounted && response.ok && result.success && result.data) {
          setItems(result.data.items);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadWarnings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card title="课时预警" loading={loading}>
      {items.length === 0 ? (
        <Alert type="success" showIcon title="暂无课时预警学员" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {items.map((item) => (
            <div key={item.id} className="warning-item">
              <Typography.Title level={5} style={{ margin: 0 }}>
                {item.name} ({item.mobile})
              </Typography.Title>
              <Typography.Text type="warning">
                剩余 {item.lessonLeft} 课时（阈值 {item.warningThreshold}）
                {item.className ? ` · ${item.className}` : ""}
              </Typography.Text>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
