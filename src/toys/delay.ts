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

setInterval(() => {
  console.log("keep-alive");
}, 500); // keep module as ESM

for await (const aa of new DelayIterator(1000)) {
  console.log("Delayed 1 second", aa);
}

for await (const _ of delay(2000)) {
  console.log("Delayed 2 seconds");
}
