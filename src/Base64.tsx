import {
  Button,
  Field,
  Input,
  Radio,
  RadioGroup,
} from "@fluentui/react-components";

import init, {
  base64_to_bytes_custom,
  bytes_to_base64,
} from "./pkg/base64_wasm.js";
import { useState } from "react";

await init();

const Base64 = () => {
  const [encodeOrDecode, setEncodeOrDecode] = useState("encode");
  const [encodedText, setEncodedText] = useState("");
  const [rawText, setRawText] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);

  const handleSubmit = () => {
    if (encodeOrDecode === "encode") {
      setEncodedText(
        bytes_to_base64(new TextEncoder().encode(rawText), urlSafe),
      );
    } else if (encodeOrDecode === "decode") {
      setRawText(
        new TextDecoder().decode(base64_to_bytes_custom(encodedText, urlSafe)),
      );
    }
  };

  return (
    <div>
      <form>
        <RadioGroup
          layout="horizontal"
          value={urlSafe ? "urlSafe" : "normal"}
          onChange={(_, data) => {
            setUrlSafe(data.value === "urlSafe");
          }}
        >
          <Radio value="normal" label="普通" />
          <Radio value="urlSafe" label="URL安全" />
        </RadioGroup>
        <Field label="原始文本" size="large">
          <Input
            id="rawText"
            name="rawText"
            value={rawText}
            onChange={(_, data) => {
              setRawText(data.value);
            }}
            disabled={encodeOrDecode === "decode"}
            placeholder="原始文本"
          />
        </Field>
        <Field label="base64编码后" size="large">
          <Input
            id="encodedText"
            name="encodedText"
            value={encodedText}
            onChange={(_, data) => {
              setEncodedText(data.value);
            }}
            disabled={encodeOrDecode === "encode"}
            placeholder="base64编码后"
          />
        </Field>

        <RadioGroup
          value={encodeOrDecode}
          onChange={(_, data) => {
            setEncodeOrDecode(data.value);
          }}
        >
          <Radio value="encode" label="编码" />
          <Radio value="decode" label="解码" />
        </RadioGroup>

        <Button
          appearance="primary"
          size="large"
          type="button"
          onClick={handleSubmit}
        >
          编/解码
        </Button>
      </form>
    </div>
  );
};

export default Base64;
