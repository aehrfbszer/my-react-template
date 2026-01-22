import { bench, do_not_optimize, run } from "mitata";

const data = "abcdefg";

bench("index", function* () {
  yield () => do_not_optimize(data[data.length - 1] === "q");
});

bench("startsWith", function* () {
  yield () => do_not_optimize(data.startsWith("q"));
});

run();
