import countStore from "../store/countStore";
import { simpleStore } from "../store/simpleStore";

const useStore = simpleStore.useStore;
const pageBId = Symbol("pageB");

function PageB() {
  const [getVal, setVal] = useStore(countStore, pageBId);

  console.log("页面B渲染");

  return (
    <div>
      <h2>我的store{getVal()} BBBBBBBBB</h2>
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
    </div>
  );
}

export default PageB;
