import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Layout from "./Layout.tsx";
import Login from "./Login.tsx";
import LayoutWithAuth from "./LayoutWithAuth.tsx";
import { simpleStore } from "./store/simpleStore.ts";

simpleStore.register(useState);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<Navigate to="/home" replace />} />

        <Route path="hello" element={<App />} />
        <Route path="home" element={<App />} />

        <Route path="login" element={<Login />} />

        <Route path="systemA" element={<LayoutWithAuth />}>
          <Route index element={<App />} />
          <Route path="query" element={<App />} />
          <Route path="edit" element={<App />} />
        </Route>

        <Route path="fruit" element={<Layout />}>
          <Route index element={<App />} />
          <Route path="apple" element={<App />} />
          <Route path="banana" element={<App />} />
        </Route>

        {/*只是前缀*/}
        <Route path="prefix">
          <Route index element={<App />} />
          <Route path="anything" element={<App />} />
        </Route>
        <Route path="*" element={<h1>404</h1>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
