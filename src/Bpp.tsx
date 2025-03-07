import { useLocation } from "react-router";
import type React from "react";
import { use, useEffect, useId, useState, useTransition } from "react";
import { getHomeList } from "./api/home";
import { SomeContext } from "./Layout";
import PageA from "./components/PageA";
import PageB from "./components/PageB";
import { simpleStore } from "./store/simpleStore";
import PageC from "./components/PageC";
import { Button } from "@fluentui/react-components";
import "./Bpp.css";
const Bpp: React.FC = () => {
  const location = useLocation();
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const cc = use(SomeContext);
  const ddd = useId();
  const [show, setShow] = useState(true);
  useEffect(() => {
    startTransition(async () => {
      try {
        await getHomeList({ fasd: "3" });
      } catch (e) {
        console.log(e, "eee");
      } finally {
        setCount((pre) => pre + 1);
      }
    });
  }, []);
  return (
    <div className="bpp">
      <h1>hello {location.pathname}</h1>
      <h2>{isPending ? "加载中" : "已完成"}</h2>
      <Button
        shape="circular"
        type="button"
        onClick={() => {
          console.log("ggggg", simpleStore.lookAllStore());
        }}
      >
        湖区全局
      </Button>
      <h2> count是几=》 {count}</h2>
      <h3>context 是 {cc.aa ?? "无"}</h3>
      <h3>id is {ddd}</h3>
      <h5
        ref={(it) => {
          console.log(it, "ref");
          return () => {
            console.log("清理 ref");
          };
        }}
      >
        ref
      </h5>
      <div>
        <h1>A</h1>
        <PageA />
      </div>
      <div>
        <h1>B</h1>
        <PageB />
      </div>
      <div>
        <Button type="button" shape="circular" onClick={() => setShow(!show)}>
          切换C
        </Button>
      </div>
      {show && (
        <div>
          <h1>C</h1>
          <PageC />
        </div>
      )}
    </div>
  );
};

export default Bpp;
