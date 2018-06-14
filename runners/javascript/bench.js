const fs = require("fs");
const process = require("process");
const Benchmark = require("benchmark");

const sample = fs.readFileSync(process.argv[2], "utf8");

module.exports = (run) => {
  "use strict";

  const bench = Benchmark({
    fn: () => run(sample),
  });

  bench.run();

  const results = {
    times: bench.stats.sample,
    document: run(sample)
  };

  console.log(JSON.stringify(results));
};
