import { simpleStore } from "../store/simpleStore";
import cStore from "../store/cStore";

const useStore = simpleStore.useStore;

const PageCId = Symbol("PageCId");

function PageC() {
  const [getVal1, setVal1] = useStore(cStore, PageCId);

  console.log("页面C渲染");

  return (
    <div>
      <h2>我的store{getVal1().dgdfg} AAAAAAAA</h2>
      <div>
        <button
          type="button"
          onClick={() => {
            setVal1((val) => ({
              ...val,
              dgdfg: val.dgdfg + 6,
            }));
          }}
        >
          更新store
        </button>
      </div>
    </div>
  );
}

export default PageC;
