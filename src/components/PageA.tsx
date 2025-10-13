import { Button } from "antd";
import { useEffect, useId } from "react";
import countStore from "../store/countStore";
import cStore from "../store/cStore";
import { SimpleStore } from "../store/simpleStore";

const useStore = SimpleStore.useStore;
const pageAId = Symbol("pageA");

function PageA() {
  const [getVal, setVal] = useStore(countStore, pageAId);
  const [getVal1, setVal1] = useStore(cStore, useId());

  console.log("页面A渲染");

  useEffect(() => {
    setVal((v) => v + 1);
  }, [setVal]);

  return (
    <div>
      <h2>我的store{getVal()} AAAAAAAA</h2>
      <div>
        <Button
          onClick={() => {
            setVal((v) => v + 1);
          }}
        >
          +1
        </Button>
      </div>
      <h2>我的store{getVal1().dgdfg} AAAAAAAA</h2>
      <div>
        <Button
          onClick={() => {
            setVal1((val) => ({
              ...val,
              dgdfg: val.dgdfg + 1,
            }));
          }}
        >
          +1
        </Button>
      </div>
    </div>
  );
}

export default PageA;
