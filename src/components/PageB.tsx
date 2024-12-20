import { useId } from "react";
import countStore from "../store/countStore";
import { simpleStore } from "../store/simpleStore";

const useStore = simpleStore.useStore;
function PageB() {
  const [getVal, setVal] = useStore(countStore, useId());

  return (
    <div>
      <h2>我的store{getVal()} BBBBBBBBB</h2>
      <div>
        <button
          onClick={() => {
            setVal(getVal() + 1);
          }}
        >
          更新store
        </button>
      </div>
    </div>
  );
}

export default PageB;
