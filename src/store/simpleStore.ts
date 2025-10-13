type Allocator = (val: unknown) => unknown;
type GarbageCollection = (fn: () => void | (() => void), deps?: any[]) => void;

type SetFnParam<Q> = Q | ((vv: Q) => Q);

const isFun = (v: unknown): v is Function => typeof v === "function";
/**
 * 全局store的目标是：
 * 1、存储全局变量
 * 2、变量更改时页面同步渲染
 * 3、不能引起其他无关页面进行不必要的重复渲染
 * 目标是：页面更新使用框架自身的能力，不额外处理（不写死框架，虽然还是做了不少处理）
 * 能力是允许跨框架的，（vue、react一起用），不过，真的有这种情况吗
 */
export class simpleStore<T> {
  #value: T;
  // 将全局 store 改为 Map，避免原来的 plain object 一些意外行为
  static #allStore = new Map<string | symbol, simpleStore<any>>();
  // pageKey -> rawSetFn
  #pageSourceMap = new Map<string | symbol, (v: SetFnParam<T>) => void>();

  // rawSetFn -> proxySetFn
  #proxyFnWeakMap = new WeakMap<
    (v: SetFnParam<T>) => void,
    (v: SetFnParam<T>) => void
  >();

  static #globalUpdater: Array<[Allocator, GarbageCollection]> = [];

  // 内部临时引用
  #innerSet!: (v: SetFnParam<T>) => void;
  #innerGet!: () => T;

  #isUpdate = false;

  // 注册全局分配器，返回当前分配器的下标
  static register(allocator: Allocator, gc: GarbageCollection) {
    const index = simpleStore.#globalUpdater.length;
    simpleStore.#globalUpdater.push([allocator, gc]);
    return index;
  }

  constructor(key: string | symbol, value: T) {
    this.#value = value;
    simpleStore.#allStore.set(key, this);
  }

  #getStoreVal() {
    return this.#value;
  }

  // 调用注册的 allocator，返回 proxy 和 gc
  #doProxy(allocatorIndex?: number): [unknown, GarbageCollection] {
    const [updater, gc] = simpleStore.#globalUpdater[allocatorIndex ?? 0] ?? [];
    if (!updater) throw new Error("未注册，请在应用入口注册 allocator");
    const proxySome = updater(this.#value);
    return [proxySome, gc];
  }

  // 将框架的 set 函数包一层，以保证 value 与其他页面同步更新
  #getProxySet(rawSetFn: (v: SetFnParam<T>) => void) {
    return (v: SetFnParam<T>) => {
      rawSetFn(v);
      const newVal = isFun(v) ? v(this.#value) : v;
      if (!this.#isUpdate) {
        this.#value = newVal;
        this.#isUpdate = true;

        for (const rawFn of this.#pageSourceMap.values()) {
          // 跳过触发本次更新的页面（由 rawSetFn 提供）
          if (rawFn === rawSetFn) continue;
          try {
            rawFn(newVal);
          } catch (e) {
            // 单个页面更新错误
            console.warn(e);
          }
        }

        this.#isUpdate = false;
      }
    };
  }

  #done(
    pageKey: string | symbol,
  ): readonly [() => T, (v: SetFnParam<T>) => void] {
    const rawFn = this.#pageSourceMap.get(pageKey);
    const getValue = () => this.#innerGet();

    if (rawFn) {
      return [getValue, this.#proxyFnWeakMap.get(rawFn)!] as const;
    }

    // react 启用StrictMode时，会重复执行useEffect，
    // 且第二次执行useEffect时，处于页面 挂载(1)->(2)->卸载(3)->(4)->挂载(5) 中的状态4
    // 导致其他组件使用同一数据源时，无法同步更新(因为卸载了其他页面，但又还没再次挂载，map是空的)
    if (getValue() !== this.#value) {
      // 同步最新值
      this.#innerSet(this.#value);
    }

    const setVal =
      this.#proxyFnWeakMap.get(this.#innerSet) ??
      this.#getProxySet(this.#innerSet);

    this.#proxyFnWeakMap.set(this.#innerSet, setVal);

    this.#pageSourceMap.set(pageKey, this.#innerSet);
    return [getValue, setVal] as const;
  }

  #getUpdater(
    pageKey: string | symbol,
    allocatorIndex?: number,
    proxyLogic?: (proxyVal: unknown) => [() => T, (v: SetFnParam<T>) => void],
  ): readonly [() => T, (v: SetFnParam<T>) => void] {
    const [proxySome, gc] = this.#doProxy(allocatorIndex);
    if (proxyLogic) {
      const [g, s] = proxyLogic(proxySome);
      this.#innerGet = g;
      this.#innerSet = s;
      return this.#done(pageKey);
    }

    // 根据常见框架约定识别 set/get
    if (Array.isArray(proxySome) && proxySome.length === 2) {
      const [val, setFn] = proxySome as [T, (v: SetFnParam<T>) => void];
      this.#innerSet = setFn;
      this.#innerGet = () => val;
      gc(() => {
        // 清理回调
        return () => {
          this.#pageSourceMap.delete(pageKey);
        };
      }, []);
    } else {
      // 视为 Vue 风格的 ref
      type VueRef = { value: T };
      const maybeVue = proxySome as VueRef;
      this.#innerSet = (v: SetFnParam<T>) => {
        maybeVue.value = isFun(v) ? v(maybeVue.value) : v;
      };
      this.#innerGet = () => maybeVue.value;
      gc(() => {
        this.#pageSourceMap.delete(pageKey);
      });
    }

    return this.#done(pageKey);
  }

  static useStore<U>(
    store: simpleStore<U>,
    pageKey: string | symbol,
    allocatorIndex?: number,
    proxyLogic?: (proxyVal: unknown) => [() => U, (v: SetFnParam<U>) => void],
  ): readonly [() => U, (v: SetFnParam<U>) => void] {
    return store.#getUpdater(pageKey, allocatorIndex, proxyLogic);
  }

  static lookAllStore = () => {
    const res: Record<string, unknown>[] = [];
    for (const [key, s] of simpleStore.#allStore.entries()) {
      res.push({ [key]: s.#getStoreVal() });
    }
    return res;
  };
}
