import { useMemo } from "react";
import { SimpleStore } from "../store/simpleStore";

/**
 * 通用的 React hook，用于使用 SimpleStore
 * 自动处理 pageKey，使用 Symbol 生成唯一键（更贴近 JS 原生）
 * @param store SimpleStore 实例
 * @param pageKey 可选的页面键，默认使用 Symbol
 * @returns [getter, setter]
 */
export const useSimpleStore = <T>(
  store: SimpleStore<T>,
  pageKey?: string | symbol,
): readonly [() => T, (v: T | ((vv: T) => T)) => void] => {
  const defaultKey = useMemo(() => Symbol("useSimpleStore"), []);
  return SimpleStore.useStore(store, pageKey || defaultKey);
};
