/**
 * SimpleStore: 一个轻量的跨框架全局 store 适配器
 * 支持：React([value, set]) 与 Vue({ value }) 两种 proxy 形式
 * 使用：在应用入口注册 allocator（返回 proxy）与 gc（清理函数），然后通过 SimpleStore.useStore 使用
 */
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
export class SimpleStore<T> {
  #value: T;
  // 将全局 store 改为 Map，避免原来的 plain object 一些意外行为
  static #allStore = new Map<string | symbol, SimpleStore<any>>();
  // pageKey -> rawSetFn
  #pageSourceMap = new Map<string | symbol, (v: SetFnParam<T>) => void>();

  // rawSetFn -> proxySetFn
  #proxyFnWeakMap = new WeakMap<(v: SetFnParam<T>) => void, (v: SetFnParam<T>) => void>();

  static #globalUpdater: Array<[Allocator, GarbageCollection]> = [];

  // 内部临时引用
  #innerSet!: (v: SetFnParam<T>) => void;
  #innerGet!: () => T;

  #isUpdate = false;

  // 注册全局分配器，返回当前分配器的下标
  static register(allocator: Allocator, gc: GarbageCollection) {
    const index = SimpleStore.#globalUpdater.length;
    SimpleStore.#globalUpdater.push([allocator, gc]);
    return index;
  }

  constructor(key: string | symbol, value: T) {
    this.#value = value;
    SimpleStore.#allStore.set(key, this);
  }

  #getStoreVal() {
    return this.#value;
  }

  /**
   * 根据 key 获取已注册的 SimpleStore 实例（若存在）
   */
  static getStore<U>(key: string | symbol): SimpleStore<U> | undefined {
    return SimpleStore.#allStore.get(key) as SimpleStore<U> | undefined;
  }

  /**
   * 删除已注册的 store（通常在测试或热重载时使用）
   */
  static deleteStore(key: string | symbol) {
    return SimpleStore.#allStore.delete(key);
  }

  // 调用注册的 allocator，返回 proxy 和 gc
  #doProxy(allocatorIndex?: number): [unknown, GarbageCollection] {
    const [updater, gc] = SimpleStore.#globalUpdater[allocatorIndex ?? 0] ?? [];
    if (!updater || !gc) throw new Error("未注册，请在应用入口注册 allocator");
    const proxySome = updater(this.#value);
    return [proxySome, gc];
  }

  // 将框架的 set 函数包一层，以保证 value 与其他页面同步更新
  #getProxySet(rawSetFn: (v: SetFnParam<T>) => void) {
    // Fast-path: 若已缓存 proxy，则直接返回，避免重复包装
    const cached = this.#proxyFnWeakMap.get(rawSetFn);
    if (cached) return cached;

    const proxy = (v: SetFnParam<T>) => {
      rawSetFn(v);
      const newVal = isFun(v) ? v(this.#value) : v;
      if (!this.#isUpdate) {
        this.#value = newVal;
        this.#isUpdate = true;

        for (const rawFn of this.#pageSourceMap.values()) {
          if (rawFn === rawSetFn) continue;
          try {
            rawFn(newVal);
          } catch (e) {
            console.warn(e);
          }
        }

        this.#isUpdate = false;
      }
    };

    this.#proxyFnWeakMap.set(rawSetFn, proxy);
    return proxy;
  }

  #done(pageKey: string | symbol): readonly [() => T, (v: SetFnParam<T>) => void] {
    const rawFn = this.#pageSourceMap.get(pageKey);
    const getValue = () => this.#innerGet();

    // React StrictMode 场景：如果框架侧的值已经变化，主动同步一次
    if (!Object.is(this.#value, this.#innerGet())) {
      this.#innerSet(this.#value);
    }

    // 如果已存在绑定，直接返回已有 proxySet（如无 proxySet 则创建并缓存）
    if (rawFn) {
      const proxySet = this.#getProxySet(rawFn);

      return [getValue, proxySet] as const;
    }

    // 创建或复用 proxy set，并缓存
    const setVal = this.#getProxySet(this.#innerSet);

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
        // React StrictMode 场景：多余的cleanup 导致pageKey被提前删除，这里用来补偿
        this.#pageSourceMap.set(pageKey, setFn);
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
    store: SimpleStore<U>,
    pageKey: string | symbol,
    allocatorIndex?: number,
    proxyLogic?: (proxyVal: unknown) => [() => U, (v: SetFnParam<U>) => void],
  ): readonly [() => U, (v: SetFnParam<U>) => void] {
    return store.#getUpdater(pageKey, allocatorIndex, proxyLogic);
  }

  static lookAllStore = () => {
    const res: Record<string, unknown>[] = [];
    for (const [key, s] of SimpleStore.#allStore.entries()) {
      res.push({ [key]: s.#getStoreVal() });
    }
    return res;
  };
}
