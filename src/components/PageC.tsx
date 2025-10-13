import { Button } from "antd";
import cStore from "../store/cStore";
import { simpleStore } from "../store/simpleStore";

const useStore = simpleStore.useStore;

const PageCId = Symbol("PageCId");

function PageC() {
  const [getVal1, setVal1] = useStore(cStore, PageCId);

  console.log("页面C渲染");

  return (
    <div>
      <h2>我的store{getVal1().dgdfg} AAAAAAAA</h2>
      <div>
        <Button
          onClick={() => {
            setVal1((val) => ({
              ...val,
              dgdfg: val.dgdfg + 6,
            }));
          }}
        >
          +6
        </Button>
      </div>
    </div>
  );
}

export default PageC;
