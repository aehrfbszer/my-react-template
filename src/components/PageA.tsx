import { useEffect, useId } from "react";
import countStore from "../store/countStore";
import { simpleStore } from "../store/simpleStore";
import cStore from "../store/cStore";

const useStore = simpleStore.useStore;
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
        <button
          type="button"
          onClick={() => {
            setVal(getVal() + 1);
          }}
        >
          更新store
        </button>
      </div>
      <h2>我的store{getVal1().dgdfg} AAAAAAAA</h2>
      <div>
        <button
          type="button"
          onClick={() => {
            setVal1((val) => ({
              ...val,
              dgdfg: val.dgdfg + 1,
            }));
          }}
        >
          更新store
        </button>
      </div>
    </div>
  );
}

export default PageA;
