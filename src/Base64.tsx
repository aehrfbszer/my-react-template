import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
  toast,
} from "@heroui/react";
import { useActionState, useEffect, useState } from "react";
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

const obj = {
  encode: {
    inputField: "rawText",
    label: "原始文本",
  },
  decode: {
    inputField: "encodedText",
    label: "base64编码后",
  },
};

interface Base64FormData {
  encodeOrDecode: "encode" | "decode";
  encodedText?: string;
  rawText?: string;
  urlSafe: "true" | "false";
  strict: "true" | "false";
}
type FormStateType = Omit<Base64FormData, "encodeOrDecode">;

const defaultFormState: Base64FormData = {
  urlSafe: "false",
  strict: "true",
  encodeOrDecode: "encode",
};

const Base64 = () => {
  const [lastInputText, setLastInputText] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const [encodeOrDecode, setEncodeOrDecode] = useState<"encode" | "decode">(
    defaultFormState.encodeOrDecode,
  );

  console.log(lastInputText);

  const handleSubmit: (prevState: Base64FormData, formData: FormData) => Base64FormData = (
    _prevState,
    formData,
  ) => {
    const data = Object.fromEntries(formData.entries()) as unknown as Base64FormData;
    console.log("formData", data);

    if (encodeOrDecode === "encode") {
      const bytes = new TextEncoder().encode(data.rawText as string);
      setResult(
        bytes.toBase64({
          alphabet: data.urlSafe === "true" ? "base64url" : "base64",
          omitPadding: data.strict === "false",
        }),
      );
    } else if (encodeOrDecode === "decode") {
      try {
        const bytes = Uint8Array.fromBase64(data.encodedText as string, {
          alphabet: data.urlSafe === "true" ? "base64url" : "base64",
          lastChunkHandling: data.strict === "true" ? "strict" : "loose",
        });
        setResult(new TextDecoder().decode(bytes));
      } catch {
        toast.danger("解码失败，请检查输入的base64编码是否正确；或是否符合所选的编码方式");
      }
    }

    return data;
  };

  const [state, formAction] = useActionState<Base64FormData, FormData>(
    handleSubmit,
    defaultFormState,
  );
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
        action={formAction}
        className="flex flex-col gap-4 p-8 bg-gray-100 rounded-lg shadow-md"
      >
        <RadioGroup isRequired name="urlSafe" defaultValue={state.urlSafe}>
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
        <RadioGroup isRequired name="strict" defaultValue={state.strict}>
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
        <TextField
          isRequired
          name={obj[encodeOrDecode].inputField}
          defaultValue={state[obj[encodeOrDecode].inputField as keyof FormStateType] as string}
        >
          <Label>{obj[encodeOrDecode].label}</Label>
          <Input
            onBlur={(e) => {
              setLastInputText(e.target.value);
            }}
          />
          <FieldError />
        </TextField>
        <TextField>
          <Label>编/解码结果</Label>
          <Input
            value={result}
            readOnly
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result);
                toast.info("文本已复制");
              } catch {
                toast.danger("复制失败");
              }
            }}
          />
        </TextField>

        <RadioGroup
          defaultValue={state.encodeOrDecode}
          name="encodeOrDecode"
          onChange={(val) => {
            setEncodeOrDecode(val as "encode" | "decode");
          }}
        >
          <Radio value="encode">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              编码
            </Radio.Content>
          </Radio>
          <Radio value="decode">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              解码
            </Radio.Content>
          </Radio>
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
