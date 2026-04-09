import { createStore } from "./store-factory";

const countStore = createStore("count", 0);

export default countStore;
