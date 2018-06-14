import os from "os";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import fs from "fs-extra";
import execa from "execa";
import glob from "globby";
import es from "event-stream";
import { BenchmarkRunner, Config, BenchmarkResult, Sample } from "./types";
import pkg from "../../runners/javascript/package.json";

const streamFinished = promisify((stream as any).finished);

let platformFlag = "--unix";
if (os.platform() === "darwin") platformFlag = "--mac";
else if (os.platform() === "win32") platformFlag = "--windows";

const fixV8Log = (srcPath: string, destPath: string): Promise<void> => {
  const src = fs.createReadStream(srcPath, "utf8");
  const dest = fs.createWriteStream(destPath, "utf8");

  const tryFix = (line: string, test: RegExp, expectedLen: number, csvIndex: number) => {
    if (!test.test(line)) return undefined;

    const split = line.split(",");

    if (split.length !== expectedLen) {
      throw new Error("invalid V8 log file");
    }

    split[csvIndex] = split[csvIndex].replace(/\\/g, "/");
    return split.join(",");
  };

  const pipeline = src
    .pipe(es.split(/\r?\n/))
    .pipe(es.map((line: string, cb: any) => {
      const fixed =
        tryFix(line, /^shared-library,/, 5, 1) ||
        tryFix(line, /^code-creation,(Script|LazyCompile),/, 9, 6) ||
        tryFix(line, /^code-creation,RegExp,/, 7, 6) ||
        line;

      return cb(null, fixed);
    }))
    .pipe(es.join("\n"))
    .pipe(dest);

  return streamFinished(pipeline);
};

const setExtension = (file: string, newExt: string) => {
  const ext = path.extname(file);
  if (ext === "") return `file.${newExt}`;
  return `${file.substr(0, file.length - ext.length)}${newExt}`;
};

interface NodeMarkdownInfo {
  packageName: string;
  friendlyName?: string;
}

class NodeRunner implements BenchmarkRunner {
  readonly description: string;
  readonly version: string;
  readonly language = "javascript";
  private config?: Config;
  private readonly script: string;
  private logs: string[] = [];

  constructor({ packageName, friendlyName }: NodeMarkdownInfo) {
    if (friendlyName) this.description = friendlyName;
    else this.description = packageName;

    this.version = pkg.dependencies[packageName];
    this.script = path.join(__dirname, "../../runners/javascript", `${packageName}.js`);
  }

  async initialize(config: Config): Promise<void> {
    this.config = config;
  }

  async benchmark(sample: Sample): Promise<BenchmarkResult> {
    // Run the JS script with profiling on.
    const { stdout } = await execa("node", ["--prof", this.script, sample.path]);
    const result: BenchmarkResult = JSON.parse(stdout);

    // Get the profiler log. It outputs to the cwd so no need for path fiddling.
    const logs = await glob("isolate-*-v8.log");
    if (logs.length > 1) throw new Error("found too many v8 logs");
    if (logs.length !== 1) throw new Error("could not find v8 log");

    // Copy profiler log to our artifact directory.
    const logPath = logs[0];

    const newLogPath = path.join(
      this.config.artifactDir,
      sample.id,
      path.basename(logPath),
    );

    await fs.mkdirp(path.dirname(newLogPath));
    await fs.rename(logPath, newLogPath);
    this.logs.push(newLogPath);

    return result;
  }

  async analyze(): Promise<void> {
    const futures = this.logs.map(async log => {
      const fixedLog = setExtension(log, ".fixed.log");
      await fixV8Log(log, fixedLog);

      const outFile = setExtension(log, ".txt");
      const outfd = await fs.open(outFile, "wx");

      try {
        const opts = { stdio: [null, outfd, outfd] };
        const childProc = execa("node", ["--prof-process", platformFlag, fixedLog], opts);
        let code: number;
        childProc.on("exit", c => { code = c; });
        await childProc;
        if (code !== 0) throw new Error("node --prof-process exited with non-zero status");
      } finally {
        await fs.close(outfd);
      }
    });

    await Promise.all(futures);
  }
}

const makeRunners: () => ReadonlyArray<BenchmarkRunner> = () => [
  { packageName: "commonmark" },
  { packageName: "markdown-it" },
  { packageName: "markdown", friendlyName: "markdown-js" },
  { packageName: "markdowndeep" },
  { packageName: "marked" },
  { packageName: "remark" },
  { packageName: "showdown" },
].map(x => new NodeRunner(x));


export default makeRunners;
