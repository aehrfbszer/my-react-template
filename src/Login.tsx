import type React from "react";
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import { useLocalStorage } from "./utils/useLocalStorage";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const usernameId = useId();
  const passwordId = useId();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/");
  };

  const [token, setToken] = useLocalStorage("token");

  useEffect(() => {
    console.log(token, "无token 在设置");
    setToken("dasdsad");
    navigate("/systemA");
  }, [setToken, token, navigate]);

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
              <label htmlFor={usernameId}>Email</label>
              <input
                type="email"
                id={usernameId}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor={passwordId}>Password</label>
              <input
                type="password"
                id={passwordId}
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
