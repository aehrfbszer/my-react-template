import { SimpleStore } from "./simpleStore";

/**
 * 创建 SimpleStore 实例的工厂函数
 * @param key 唯一键
 * @param initialValue 初始值
 * @returns SimpleStore 实例
 */
export const createStore = <T>(key: string | symbol, initialValue: T): SimpleStore<T> =>
  new SimpleStore(key, initialValue);
