import { Button } from "antd";
import { useEffect } from "react";
import countStore from "../store/countStore";
import { useSimpleStore } from "../utils/use-simple-store";

const pageBId = Symbol("pageB");

function PageB() {
  const [getVal, setVal] = useSimpleStore(countStore, pageBId);

  useEffect(() => {
    setVal((v) => v + 3);
  }, [setVal]);

  console.log("页面B渲染");

  return (
    <div>
      <h2>我的store{getVal()} BBBBBBBBB</h2>
      <div>
        <Button
          onClick={() => {
            setVal((v) => v + 1);
          }}
        >
          +1
        </Button>
      </div>
    </div>
  );
}

export default PageB;
