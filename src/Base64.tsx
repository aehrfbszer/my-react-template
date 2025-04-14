import { Radio, Form, Input, Button, Typography } from "antd";
import init, { base64_to_bytes, bytes_to_base64 } from "./pkg/base64_wasm.js";
import { useState } from "react";

type FieldType = {
  encodeOrDecode: "encode" | "decode";
  encodedText?: string;
  rawText?: string;
  urlSafe: boolean;
};
const { Text } = Typography;
await init();

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

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
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
        <Form.Item<FieldType> label="原始文本" name="rawText">
          <Input
            onChange={(e) => {
              setLastInputText(e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item<FieldType> label="base64编码后" name="encodedText">
          <Input
            onChange={(e) => {
              setLastInputText(e.target.value);
            }}
          />
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
    </div>
  );
};

export default Base64;
