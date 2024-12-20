type Allocator = (val: unknown) => unknown;
interface GlobalUpdater<T> {
  setVal: (v: T | ((vv: T) => T)) => void;
  getVal: () => T;
}

const isFun = (v: unknown) => typeof v === "function";
/**
 * 全局store的目标是：
 * 1、存储全局变量
 * 2、变量更改时页面同步渲染
 * 3、不能引起其他无关页面进行不必要的重复渲染
 * 目标是：页面更新使用框架自身的能力，不额外处理（写死框架）
 */
export class simpleStore<T> {
  #value: T;
  static #allStore: Record<string | symbol, simpleStore<any>> = {};
  #pageSourceMap: Record<string, [GlobalUpdater<T>["setVal"], symbol]> = {};

  static #globalUpdater: Allocator[] = [];

  innerSet?: GlobalUpdater<T>["setVal"];
  innerGet?: GlobalUpdater<T>["getVal"];

  #onceAction: symbol = Symbol();
  #isUpdate = false;

  // 注册全局分配器，返回当前分配器的下标，即全局分配器数量减一
  static register(allocator: Allocator) {
    const index = simpleStore.#globalUpdater.length;
    simpleStore.#globalUpdater.push(allocator);
    return index;
  }

  getVal = () => this.#value;

  constructor(key: string, value: T) {
    this.#value = value;
    simpleStore.#allStore[key] = this;
  }

  // proxy 不能是全局的，是绑定框架的运行机制，需要和生命周期绑在一起
  doProxy(allocatorIndex?: number) {
    const updater = simpleStore.#globalUpdater[allocatorIndex ?? 0];
    if (!updater) throw new Error("未注册，请在(app|main).(tx|tsx)中注册");
    const proxySome = updater(this.#value);
    return proxySome;
  }

  #done(pageKey: string) {
    console.log("新1",pageKey);

    const mySet = (v: T | ((vv: T) => T)) => {
      console.log(this.#value, "---11", this.innerGet!());
      const newVal = isFun(v) ? v(this.#value) : v;
      this.#value = newVal;
      this.innerSet!(newVal);
      if (!this.#isUpdate) {
        this.#onceAction = Symbol();
        this.#isUpdate = true;
        console.log("一次用户操作-----------------------------------");
        for (const arr of Object.values(this.#pageSourceMap)) {
          const [fn, syl] = arr;
          console.log(syl === this.#onceAction, "---33");

          if (syl === this.#onceAction) continue;
          fn(newVal);
          arr[1] = this.#onceAction;
        }
        this.#isUpdate = false;
      }

      console.log(this.#value, "---22", this.innerGet!());
    };
    const weakKey = [
      () => {
        console.log("获取", this.#value);

        return this.#value;
      },
      mySet,
    ] as const;
    this.#pageSourceMap[pageKey] = [mySet, this.#onceAction];

    for (const arr of Object.values(this.#pageSourceMap)) {
      console.log(this.#onceAction === arr[1], "---44");
    }

    return weakKey;
  }

  getUpdater = (
    pageKey: string,
    allocatorIndex?: number,
    proxyLogic?: (
      proxyVal: unknown,
    ) => [GlobalUpdater<T>["getVal"], GlobalUpdater<T>["setVal"]],
  ) => {
    const proxySome = this.doProxy(allocatorIndex);
    if (proxyLogic) {
      [this.innerGet, this.innerSet] = proxyLogic(proxySome);
      return this.#done(pageKey);
    }
    switch ((proxySome as { length: number }).length) {
      case 2:
        {
          const maybeReact = proxySome as [T, GlobalUpdater<T>["setVal"]];
          this.innerGet = () => maybeReact[0];
          this.innerSet = maybeReact[1];
        }
        break;
      default: {
        type VueType<S> = {
          get value(): S;
          set value(_: S);
        };
        const maybeVue = proxySome as unknown as VueType<T>;
        this.innerGet = () => maybeVue.value;
        this.innerSet = (v) =>
          (maybeVue.value = isFun(v) ? v(maybeVue.value) : v);
      }
    }

    return this.#done(pageKey);
  };

  static useStore<U>(
    store: simpleStore<U>,
    pageKey: string,
    allocatorIndex?: number,
    proxyLogic?: (
      proxyVal: unknown,
    ) => [GlobalUpdater<U>["getVal"], GlobalUpdater<U>["setVal"]],
  ) {
    return store.getUpdater(pageKey, allocatorIndex, proxyLogic);
  }

  static lookAllStore = () => {
    return Object.entries(simpleStore.#allStore).map(([key, cls]) => [
      key,
      cls.getVal(),
    ]);
  };
}
