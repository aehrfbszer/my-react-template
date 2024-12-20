import { simpleStore } from "./simpleStore";

const cStore = new simpleStore(Symbol("ccc"), {
  ds: () => {
    console.log("获取dsd");
  },
  dgdfg: "广泛认同个",
});

export default cStore;
