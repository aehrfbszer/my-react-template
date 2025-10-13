import { SimpleStore } from "./simpleStore";

const cStore = new SimpleStore(Symbol("ccc"), {
  ds: () => {
    console.log("获取dsd");
  },
  dgdfg: 0,
});

export default cStore;
