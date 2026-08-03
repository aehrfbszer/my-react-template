export async function* delay(ms: number) {
  const { resolve, promise } = Promise.withResolvers<void>();
  setTimeout(() => {
    resolve();
  }, ms);

  await promise;

  yield;
}

export class DelayIterator {
  #ms: number;

  constructor(ms: number) {
    this.#ms = ms;
  }
  [Symbol.dispose]() {
    console.log("DelayIterator disposed");
  }

  // 这一行等价于 [Symbol.asyncIterator]: async function*() {
  async *[Symbol.asyncIterator]() {
    const { resolve, promise } = Promise.withResolvers<void>();
    setTimeout(() => {
      resolve();
    }, this.#ms);
    await promise;

    let i = 10;
    while (i-- > 0) {
      await new Promise((res) => setTimeout(res, this.#ms));
      yield i;
    }
  }
}

using d = new DelayIterator(10);
for await (const aa of d) {
  console.log("Delayed 1 second", aa);
}

for await (const _ of delay(20)) {
  console.log("Delayed 2 seconds");
}

const array = await Array.fromAsync(d);
console.log("Array from async iterator:", array);
