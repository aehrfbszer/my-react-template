import { Button, Form, Input, Radio, Typography } from "antd";
import { useEffect, useState } from "react";
import { myFetch } from "./api/myFetch";
import "./Base64.css";

// const wasmObj = {
//   my_namespace: { imported_func: (arg) => console.log(arg) },
// }
// WebAssembly.instantiateStreaming(
//   myFetch({
//     url: "/static/base64_wasm.wasm",
//     method: "POST",
//   }, {

//     responseIsJson: false,
//   }),
//   wasmObj
// ).then(
//   (obj) => {
//     console.log("wasm init success", obj);
//   }
// )

type FieldType = {
  encodeOrDecode: "encode" | "decode";
  encodedText?: string;
  rawText?: string;
  urlSafe: boolean;
  strict: boolean;
};
const { Text } = Typography;

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
    strict,
  }: FieldType) => {
    if (encodeOrDecode === "encode") {
      const bytes = new TextEncoder().encode(rawText);
      form.setFieldValue(
        "encodedText",
        bytes.toBase64({
          alphabet: urlSafe ? "base64url" : "base64",
          omitPadding: !strict,
        }),
      );
    } else if (encodeOrDecode === "decode") {
      const bytes = Uint8Array.fromBase64(encodedText, {
        alphabet: urlSafe ? "base64url" : "base64",
        lastChunkHandling: strict ? "strict" : "loose",
      });

      form.setFieldValue("rawText", new TextDecoder().decode(bytes));
    }
  };
  useEffect(() => {
    myFetch(
      {
        url: "/users/all",
        method: "GET",
      },
      {
        responseIsJson: false,
      },
    ).then((res) => {
      console.log("获取用户列表", res);
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
        initialValues={{
          encodeOrDecode: "encode",
          urlSafe: false,
          strict: true,
        }}
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
          label="base64严谨格式"
          name="strict"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value={true}> 是 </Radio>
            <Radio value={false}> 否 </Radio>
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
          myFetch(
            {
              url: "/task/nao%F0%9F%8C%99fno%F0%9F%8C%8F/",
              method: "POST",
              data: {
                name: "aa",
                age: 77,
                email: "dfsdqw@qq.com",
              },
            },
            {
              responseIsJson: false,
            },
          )
            .then((res) => res.text())
            .then((data) => {
              console.log("任务创建结果", data);
            });
        }}
      >
        发送请求
      </Button>
      <Button
        onClick={() => {
          myFetch({
            url: "/task/blob/",
            method: "POST",
            data: new Blob(
              [
                JSON.stringify({
                  name: "bb",
                  age: 88,
                  email: "",
                }),
              ],
              // { type: "application/json" },
            ),
          });
          myFetch({
            url: "/task/string/",
            method: "POST",
            data: "just a string",
          });
          myFetch(
            {
              url: "/users/all",
              method: "GET",
            },
            {
              cache: true,
            },
          ).then((res) => {
            console.log("第二次获取用户列表", res);
          });
        }}
      >
        发送请求测试
      </Button>
      <Button
        onClick={() => {
          myFetch({
            url: "/task/111/",
            method: "POST",
            data: {
              name: "cc",
              age: 99,
              email: "f9weuir@gmail.com",
            },
            signal: AbortSignal.timeout(1),
          });
        }}
      >
        超时取消按钮
      </Button>
      <Button
        onClick={() => {
          myFetch({
            url: "/set-cookie",
            method: "POST",
          }).then((res) => {
            console.log("设置cookie结果", res);
          });
        }}
      >
        设置cookie
      </Button>
      <Button
        onClick={() => {
          myFetch({
            url: "/be-expired",
            method: "POST",
            data: {
              name: "aa",
              age: 77,
              email: "dfsdqw@qq.com",
            },
          });
        }}
      >
        使token过期
      </Button>
    </div>
  );
};

export default Base64;
