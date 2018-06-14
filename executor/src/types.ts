/** Benchmark configuration. */
export interface Config {
  /** Minimum number of iterations to perform. */
  readonly minIterations: number;

  /** Maximum time to run the benchmark, in seconds. Overrides minIterations. */
  readonly maxTime: number;

  /** Absolute path of output directory for benchmark artifacts. */
  readonly artifactDir: string;
}

/** A sample Markdown file to run benchmarks on. */
export interface Sample {
  /** A unique identifier for the sample. */
  readonly id: string;

  /** Friendly name of the sample. */
  readonly friendlyName: string;

  /** Absolute path to the sample file. */
  readonly path: string;
}

export interface BenchmarkResult {
  /** Array of sampled times in microseconds. */
  times: ReadonlyArray<number>;

  /** HTML output. */
  document: string;
}

/** Controls benchmarking for a Markdown implemenation. */
export interface BenchmarkRunner {
  /** Programming language the implementation uses. */
  readonly language: string;

  /** Name of the implementation. */
  readonly description: string;

  /** Version of the implementation. */
  readonly version: string;

  /** Perform setup prior to benchmarking. Called once. */
  initialize(config: Config): Promise<void>;

  /** Run a benchmark on the given sample. */
  benchmark(sample: Sample): Promise<BenchmarkResult>;

  /** Perform postprocessing of benchmark artifacts. */
  analyze(): Promise<void>;
}
