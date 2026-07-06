import { createStore } from "./core/simpleStore";

const cStore = createStore(Symbol("ccc"), {
  ds: () => {
    console.log("获取dsd");
  },
  dgdfg: 0,
});

export default cStore;
