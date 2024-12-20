type Allocator = (val: unknown) => unknown;

type SetFnParam<Q> = Q | ((vv: Q) => Q);
interface GlobalUpdater<T> {
  setVal: (v: SetFnParam<T>) => void;
  getVal: () => T;
}

const isFun = (v: unknown) => typeof v === "function";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static #allStore: Record<string | symbol, simpleStore<any>> = {};
  #pageSourceMap: Record<
    string | symbol,
    [
      proxySetFn: GlobalUpdater<T>["setVal"],
      uniqueKey: symbol,
      rawSetFn: GlobalUpdater<T>["setVal"],
    ]
  > = {};

  static #globalUpdater: Allocator[] = [];

  innerSet!: GlobalUpdater<T>["setVal"];
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

  constructor(key: string | symbol, value: T) {
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

  #done(pageKey: string | symbol) {
    console.log("pageKey", pageKey);
    const oldDoneArr = this.#pageSourceMap[pageKey];

    const getValue = () => this.innerGet?.() ?? this.#value;

    if (oldDoneArr) {
      return [getValue, oldDoneArr[0]] as const;
    }

    const mySet =
      (theSetFn: GlobalUpdater<T>["setVal"]) => (v: SetFnParam<T>) => {
        console.log("进行 setVal ---11");
        const newVal = isFun(v) ? v(getValue()) : v;
        this.#value = newVal;
        theSetFn(newVal);
        if (!this.#isUpdate) {
          this.#onceAction = Symbol();
          this.#isUpdate = true;
          console.log("一次用户操作-----------------------------------");
          for (const pKey of Reflect.ownKeys(this.#pageSourceMap)) {
            const [fn, syl, rawFn] = this.#pageSourceMap[pKey];

            const done = syl === this.#onceAction || rawFn === theSetFn;

            console.log(
              "查询所有同一个store，包括触发者 ---33",
              `【${done}】`,
              "true代表已更新；false代表未更新",
            );

            if (done) continue;
            console.log("进行更新其他未被更新的 ---44");

            fn(newVal);
            this.#pageSourceMap[pKey][1] = this.#onceAction;
          }
          this.#isUpdate = false;
        }
      };
    const finalSetFn = mySet(this.innerSet);
    console.log("重新进行魔法的创建");

    const weakKey = [getValue, finalSetFn] as const;
    this.#pageSourceMap[pageKey] = [
      finalSetFn,
      this.#onceAction,
      this.innerSet,
    ];

    return weakKey;
  }

  getUpdater = (
    pageKey: string | symbol,
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
          this.innerSet = maybeReact[1];
          this.innerGet = () => maybeReact[0];
        }
        break;
      default: {
        type VueType<S> = {
          get value(): S;
          set value(_: S);
        };
        const maybeVue = proxySome as unknown as VueType<T>;
        this.innerSet = (v) =>
          (maybeVue.value = isFun(v) ? v(maybeVue.value) : v);
        this.innerGet = () => maybeVue.value;
      }
    }

    return this.#done(pageKey);
  };

  static useStore<U>(
    store: simpleStore<U>,
    pageKey: string | symbol,
    allocatorIndex?: number,
    proxyLogic?: (
      proxyVal: unknown,
    ) => [GlobalUpdater<U>["getVal"], GlobalUpdater<U>["setVal"]],
  ) {
    return store.getUpdater(pageKey, allocatorIndex, proxyLogic);
  }

  static lookAllStore = () => {
    return Reflect.ownKeys(simpleStore.#allStore).map((key) => ({
      [key]: simpleStore.#allStore[key].getVal(),
    }));
  };
}
