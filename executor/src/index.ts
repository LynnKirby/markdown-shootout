import fs from "fs-extra";
import path from "path";
import hasha from "hasha";
import Listr from "listr";
import chalk from "chalk";
import Observable from "zen-observable";
import nodeRunners from "./node-runners";
import { BenchmarkRunner } from "./types";

const minIterations = 100;
const maxTime = 10;
const outputDir = path.join(__dirname, "../../output");

const samples = [
  "README.md",
].map(x => ({
  friendlyName: x,
  path: path.join(__dirname, "../../samples", x),
  id: hasha(x, { algorithm: "md5" }),
}));

const runnerTitle = (r: BenchmarkRunner) => `${r.description} (${r.version}) [${r.language}]`;

// TODO: More than Node implementations.
const runners = nodeRunners();

const setupTasks = runners.map(r => ({
  title: runnerTitle(r),
  async task() {
    const artifactDir = path.join(outputDir, r.language, r.description);
    await fs.mkdirp(artifactDir);
    await r.initialize({ minIterations, maxTime, artifactDir });
  },
}));

// TODO: Something fishy about this global ZenObservable namespace...
const runAllBenchmarks = async (r: BenchmarkRunner, obs: ZenObservable.Observer<string>) => {
  try {
    // TODO: Fix all of these eslint rules
    // eslint-disable-next-line
    for (const s of samples) {
      obs.next(s.friendlyName);
      const result = await r.benchmark(s); // eslint-disable-line no-await-in-loop
      const times = path.join(outputDir, r.language, r.description, s.id, "times.json");
      const html = path.join(outputDir, r.language, r.description, s.id, "output.html");
      const futures = [
        fs.writeFile(times, JSON.stringify(result.times)),
        fs.writeFile(html, result.document),
      ];
      await Promise.all(futures); // eslint-disable-line no-await-in-loop
    }
  } catch (error) {
    obs.error(error);
    return;
  }

  obs.complete();
};

const benchmarkTasks = runners.map(runner => ({
  title: runnerTitle(runner),
  task(): any {
    // 'any' is used here because Listr type declaration is missing
    // Observer from task() return type
    // TODO: fix type declaration
    return new Observable(obs => { runAllBenchmarks(runner, obs); });
  },
}));

const processTasks = runners.map(r => ({
  title: runnerTitle(r),
  task: () => r.analyze(),
}));

const tasks = new Listr([
  {
    title: "Initialize",
    task: () => new Listr(setupTasks, { concurrent: true }),
  },
  {
    title: "Benchmark",
    task: () => new Listr(benchmarkTasks),
  },
  {
    title: "Analyze",
    task: () => new Listr(processTasks, { concurrent: true }),
  },
]);

const banner
  = "___  ___           _       _\n"
  + "|  \\/  |          | |     | |\n"
  + "| .  . | __ _ _ __| | ____| | _____      ___ __\n"
  + "| |\\/| |/ _` | '__| |/ / _` |/ _ \\ \\ /\\ / / '_ \\\n"
  + "| |  | | (_| | |  |   < (_| | (_) \\ V  V /| | | |\n"
  + "\\_|  |_/\\__,_|_|  |_|\\_\\__,_|\\___/ \\_/\\_/ |_| |_|\n"
  + "   _____ _                 _              _\n"
  + "  /  ___| |               | |            | |\n"
  + "  \\ `--.| |__   ___   ___ | |_ ___  _   _| |_\n"
  + "   `--. \\ '_ \\ / _ \\ / _ \\| __/ _ \\| | | | __|\n"
  + "  /\\__/ / | | | (_) | (_) | || (_) | |_| | |_\n"
  + "  \\____/|_| |_|\\___/ \\___/ \\__\\___/ \\__,_|\\__|\n";

console.log(chalk.red(banner));
const version = fs.readFileSync(path.join(__dirname, "../../VERSION"));
console.log(`   Version ${version}\n`);

tasks.run()
  .then(() => {
    console.log(chalk.green("\nBenchmark complete!"));
    console.log(`View output at: ${outputDir}\n`);
    process.exit(0);
  })
  .catch((e: Error) => {
    console.log(chalk.red("\nOh no, something went wrong!\n"));
    console.log(e.stack);
    console.log();
    process.exit(1);
  });
