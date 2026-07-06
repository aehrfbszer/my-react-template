import { createStore } from "./core/simpleStore";

const countStore = createStore("count", 0);

export default countStore;
