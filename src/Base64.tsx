import { Radio, Form, Input, Button, Typography } from "antd";
import init, { base64_to_bytes, bytes_to_base64 } from "./pkg/base64_wasm";
import { useState, useEffect } from "react";
import { myFetch } from "./api/myFetch";
import "./Base64.css";

type FieldType = {
  encodeOrDecode: "encode" | "decode";
  encodedText?: string;
  rawText?: string;
  urlSafe: boolean;
};
const { Text } = Typography;
await init();

const CopyText = ({ value }: { value?: string }) => (
  <Text copyable keyboard>
    {value}
  </Text>
);

const Base64 = () => {
  const [form] = Form.useForm();

  const [lastInputText, setLastInputText] = useState<string>("");

  const handleSubmit = ({
    encodeOrDecode,
    urlSafe,
    rawText = "",
    encodedText = "",
  }: FieldType) => {
    if (encodeOrDecode === "encode") {
      form.setFieldValue(
        "encodedText",
        bytes_to_base64(new TextEncoder().encode(rawText), urlSafe),
      );
    } else if (encodeOrDecode === "decode") {
      form.setFieldValue(
        "rawText",
        new TextDecoder().decode(base64_to_bytes(encodedText, urlSafe)),
      );
    }
  };
  useEffect(() => {
    myFetch({
      url: "/api/test/multipart",
      method: "POST",
      data: new FormData(),
    });
    myFetch({
      url: "/api/test/urlencoded",
      method: "POST",
      data: new URLSearchParams([["a", "b"]]),
    });
    myFetch({
      url: "/api/test/json",
      method: "POST",
      data: { a: "b" },
    });
  }, []);

  return (
    <div className="wrapper">
      <div className="flex-line">
        <Text>上次输入的文字：</Text>
        <Text copyable>{lastInputText}</Text>
      </div>
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={{ encodeOrDecode: "encode", urlSafe: false }}
      >
        <Form.Item<FieldType>
          label="base64编码方式"
          name="urlSafe"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value={false}> 普通 </Radio>
            <Radio value={true}> url 安全 </Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item<FieldType>
          label="原始文本"
          shouldUpdate={(prev, curr) =>
            prev.encodeOrDecode !== curr.encodeOrDecode
          }
        >
          {({ getFieldValue }) => {
            return (
              <Form.Item name="rawText">
                {getFieldValue("encodeOrDecode") === "encode" ? (
                  <Input
                    onBlur={(e) => {
                      setLastInputText(e.target.value);
                    }}
                  />
                ) : (
                  <CopyText />
                )}
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item<FieldType>
          label="base64编码后"
          shouldUpdate={(prev, curr) =>
            prev.encodeOrDecode !== curr.encodeOrDecode
          }
        >
          {({ getFieldValue }) => {
            return (
              <Form.Item name="encodedText">
                {getFieldValue("encodeOrDecode") === "decode" ? (
                  <Input
                    onBlur={(e) => {
                      setLastInputText(e.target.value);
                    }}
                  />
                ) : (
                  <CopyText />
                )}
              </Form.Item>
            );
          }}
        </Form.Item>

        <Form.Item<FieldType>
          label="编码/解码"
          name="encodeOrDecode"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value="encode">编码</Radio>
            <Radio value="decode">解码</Radio>
          </Radio.Group>
        </Form.Item>

        <Button type="primary" htmlType="submit" shape="round">
          编/解码
        </Button>
      </Form>
      <Button
        onClick={() => {
          fetch("http://localhost:8899/task/nao%F0%9F%8C%99fno%F0%9F%8C%8F/", {
            method: "POST",
            body: JSON.stringify({
              name: "aa",
              age: 77,
              email: "dfsdqw@qq.com",
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
        }}
      >
        发送请求
      </Button>
    </div>
  );
};

export default Base64;
