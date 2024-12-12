import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLocalStorage } from "../utils/useLocalStorage.ts";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/");
  };

  const [token, setToken] = useLocalStorage("token");

  useEffect(() => {
    console.log(token, "无token 在设置");
    setToken("dasdsad");
    navigate("/systemA");
  }, [setToken, token]);

  return (
    <div className="login">
      <div className="login-container">
        <div className="login-header">
          {/*<img src={logo} alt="logo" />*/}
          <h1>Login</h1>
        </div>
        <div className="login-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
