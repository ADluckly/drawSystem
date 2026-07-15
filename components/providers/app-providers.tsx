"use client";

import "antd/dist/reset.css";

import { App, ConfigProvider, theme } from "antd";
import type { PropsWithChildren } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1d4ed8",
          borderRadius: 10,
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
