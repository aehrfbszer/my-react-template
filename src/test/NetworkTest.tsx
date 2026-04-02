import { Button } from "antd";
import { saveCredentials, someFetch } from "../api/testToken";

const prefix = "/api/v1";

const getPath = (endpoint: string) => `${prefix}${endpoint}`;

const getText = (res: Response) => res.text();

const login = (data: { user_id: string }) => {
  return someFetch<{ token: string }>(
    {
      url: getPath("/token"),
      method: "POST",
      data,
    },
    {
      // clearHeaders: ["Authorization"],
      withoutGlobalDynamicHeaders: true,
    },
  );
};

const data = () => {
  return someFetch(
    {
      url: getPath("/protected/data"),
      method: "GET",
      signal: AbortSignal.timeout(100), // 请求超时示例
    },
    {
      responseIsJson: false,
    },
  ).then(getText);
};
const user = () => {
  return someFetch(
    {
      url: getPath("/protected/user"),
      method: "GET",
    },
    {
      responseIsJson: false,
    },
  ).then(getText);
};
const posts = () => {
  return someFetch(
    {
      url: getPath("/protected/posts"),
      method: "GET",
    },
    {
      responseIsJson: false,
    },
  ).then(getText);
};

const alwaysExpired = () => {
  return someFetch(
    {
      url: getPath("/protected/profile"),
      method: "GET",
      headers: {
        authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE3NzUwMzUxODN9.FjnjvfYdnKltzxEfcCxqftfqNXfG0__Mtou5dDfXoIg",
      },
    },
    {
      responseIsJson: false,
    },
  ).then(getText);
};

const NetworkTest = () => {
  return (
    <div>
      <h1>Network Test</h1>
      <p>This is a placeholder for network-related tests.</p>
      <Button
        onClick={() =>
          login({ user_id: "123" })
            .then((res) => {
              saveCredentials(res.token);
              console.log("Login successful, token saved:", res.token);
            })
            .catch((err) => console.error("Login error:", err))
        }
      >
        Login
      </Button>
      <Button
        onClick={() =>
          data()
            .then((res) => console.log("Data response:", res))
            .catch((err) => console.error("Data error:", err))
        }
      >
        100ms超时
      </Button>
      <Button
        onClick={() =>
          user()
            .then((res) => console.log("User response:", res))
            .catch((err) => console.error("User error:", err))
        }
      >
        Get User
      </Button>
      <Button
        onClick={() =>
          posts()
            .then((res) => console.log("Posts response:", res))
            .catch((err) => console.error("Posts error:", err))
        }
      >
        Get Posts
      </Button>

      <Button
        onClick={() => {
          user().then(console.log).catch(console.error);
          posts().then(console.log).catch(console.error);
        }}
      >
        批量请求
      </Button>

      <Button
        onClick={() =>
          alwaysExpired()
            .then((res) => console.log("Always Expired response:", res))
            .catch((err) => console.error("Always Expired error:", err))
        }
      >
        请求一个永远过期的token
      </Button>
    </div>
  );
};

export default NetworkTest;
