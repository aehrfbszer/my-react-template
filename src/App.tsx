import Bpp from "./Bpp.tsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Layout from "./Layout.tsx";
import Login from "./Login.tsx";
import LayoutWithAuth from "./LayoutWithAuth.tsx";
import Base64 from "./Base64.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Navigate to="/base" replace />} />

        <Route path="hello" element={<Bpp />} />
        <Route path="home" element={<Bpp />} />
        <Route path="base" element={<Base64 />} />

        <Route path="login" element={<Login />} />

        <Route path="systemA" element={<LayoutWithAuth />}>
          <Route index element={<Bpp />} />
          <Route path="query" element={<Bpp />} />
          <Route path="edit" element={<Bpp />} />
        </Route>

        <Route path="fruit" element={<Layout />}>
          <Route index element={<Bpp />} />
          <Route path="apple" element={<Bpp />} />
          <Route path="banana" element={<Bpp />} />
        </Route>

        {/*只是前缀*/}
        <Route path="prefix">
          <Route index element={<Bpp />} />
          <Route path="anything" element={<Bpp />} />
        </Route>
        <Route path="*" element={<h1>404</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
