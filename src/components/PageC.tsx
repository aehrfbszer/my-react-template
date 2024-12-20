import { useEffect, useId } from "react";
import { simpleStore } from "../store/simpleStore";
import cStore from "../store/cStore";

const useStore = simpleStore.useStore;

function PageC() {
  const [getVal1, setVal1] = useStore(cStore, useId());

  console.log("页面C渲染");

  useEffect(() => {
    console.log("useEffect", getVal1());
  }, [getVal1]);

  return (
    <div>
      <h2>我的store{getVal1().dgdfg} AAAAAAAA</h2>
      <div>
        <button
          onClick={() => {
            setVal1({
              ...getVal1(),
              dgdfg: "更新",
            });
          }}
        >
          更新store
        </button>
      </div>
    </div>
  );
}

export default PageC;
