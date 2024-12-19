import countStore from "../store/countStore";
import { simpleStore } from "../store/simpleStore";

const useStore = simpleStore.useStore;

function PageA() {
  const [getVal, setVal] = useStore(countStore, "A");

  return (
    <div>
      <h2>我的store{getVal()} AAAAAAAA</h2>
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

export default PageA;
