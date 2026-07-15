"use client";

import Link from "next/link";
import { Button, Result } from "antd";

export default function ForbiddenPage() {
  return (
    <Result
      status="403"
      title="403"
      subTitle="你没有权限访问此页面。"
      extra={
        <Link href="/dashboard">
          <Button type="primary">返回仪表盘</Button>
        </Link>
      }
    />
  );
}
