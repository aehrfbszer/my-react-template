import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { simpleStore } from "./store/simpleStore.ts";
import { ConfigProvider } from "antd";

simpleStore.register(useState, useEffect);
// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
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
