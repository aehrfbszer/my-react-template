import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { useEffect, useState, type SubmitEvent } from "react";
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

// type FieldType = {
//   encodeOrDecode: "encode" | "decode";
//   encodedText?: string;
//   rawText?: string;
//   urlSafe: boolean;
//   strict: boolean;
// };
// // const { Text } = Typography;

// const CopyText = ({ value }: { value?: string }) => (
//   <Text copyable keyboard>
//     {value}
//   </Text>
// );

const Base64 = () => {
  const [lastInputText, setLastInputText] = useState<string>("");
  console.log(lastInputText);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (e.currentTarget) {
      const formData = new FormData(e.currentTarget);
      const data: Record<string, string> = {};
      // Convert FormData to plain object
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });

      console.log(formData, "formData", e.currentTarget, data);
      return;
    }
    // if (encodeOrDecode === "encode") {
    //   const bytes = new TextEncoder().encode(rawText);
    //   form.setFieldValue(
    //     "encodedText",
    //     bytes.toBase64({
    //       alphabet: urlSafe ? "base64url" : "base64",
    //       omitPadding: !strict,
    //     }),
    //   );
    // } else if (encodeOrDecode === "decode") {
    //   const bytes = Uint8Array.fromBase64(encodedText, {
    //     alphabet: urlSafe ? "base64url" : "base64",
    //     lastChunkHandling: strict ? "strict" : "loose",
    //   });

    //   form.setFieldValue("rawText", new TextDecoder().decode(bytes));
    // }
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
      <Form
        //@ts-ignore
        onSubmit={handleSubmit}
        initialValues={{
          encodeOrDecode: "encode",
          urlSafe: false,
          strict: true,
        }}
      >
        <RadioGroup name="urlSafe">
          <Label>base64编码方式</Label>
          <Radio value="false">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              普通
            </Radio.Content>
          </Radio>
          <Radio value="true">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              url 安全
            </Radio.Content>
          </Radio>
        </RadioGroup>
        <RadioGroup name="strict">
          <Label>base64严谨格式</Label>
          <Radio value="true">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              是
            </Radio.Content>
          </Radio>
          <Radio value="false">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              否
            </Radio.Content>
          </Radio>
        </RadioGroup>
        <TextField isRequired name="rawText">
          <Label>原始文本</Label>
          <Input
            onBlur={(e) => {
              setLastInputText(e.target.value);
            }}
          />
          <FieldError />
        </TextField>
        <TextField isRequired name="encodedText">
          <Label>base64编码后</Label>
          <Input
            onBlur={(e) => {
              setLastInputText(e.target.value);
            }}
          />
          <FieldError />
        </TextField>

        <RadioGroup name="encodeOrDecode">
          <Radio value="encode">编码</Radio>
          <Radio value="decode">解码</Radio>
        </RadioGroup>

        <Button variant="primary" type="submit">
          编/解码
        </Button>
      </Form>
      <Button
        onPress={() => {
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
        onPress={() => {
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
          myFetch({
            url: "/users/all",
            method: "GET",
          }).then((res) => {
            console.log("第二次获取用户列表", res);
          });
        }}
      >
        发送请求测试
      </Button>
      <Button
        onPress={() => {
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
        onPress={() => {
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
        onPress={() => {
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
