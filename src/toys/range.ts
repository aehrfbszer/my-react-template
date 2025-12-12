export function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

export class RangeIterator {
  #current: number;
  #end: number;

  constructor(start: number, end: number) {
    this.#current = start;
    this.#end = end;
  }

  // next(): { value: number; done: boolean } {
  //     if (this.#current < this.#end) {
  //         return { value: this.#current++, done: false };
  //     } else {
  //         return { value: this.#end, done: true };
  //     }
  // }
  //
  // [Symbol.iterator]() {
  //     return this;
  // }

  *[Symbol.iterator]() {
    while (this.#current < this.#end) {
      yield this.#current++;
    }
  }
  [Symbol.dispose]() {
    console.log("RangeIterator disposed");
  }
}
using r = new RangeIterator(5, 10);
for (const num of r) {
  console.log(num); // Logs numbers from 5 to 9
}
console.log("---");

for (const num of range(3, 7)) {
  console.log(num); // Logs numbers from 3 to 6
}
