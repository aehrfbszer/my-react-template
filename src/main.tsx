import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { simpleStore } from "./store/simpleStore.ts";
import { ConfigProvider } from "antd";

simpleStore.register(useState, useEffect);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          /// antd 不支持其他的颜色表示，比如hsl, color(display-p3 1 0.5 0.5 / 0.5)等

          // Seed Token，影响范围大
          colorPrimary: "#00b96b",
          borderRadius: 2,

          // 派生变量，影响范围小
          colorBgContainer: "#f6ffed",
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
