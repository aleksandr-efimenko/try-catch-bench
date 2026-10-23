// Times variants.mjs and prints one JSON summary. Sizes come from measure.sh via the environment.
import { guarded, plain, throwObject, throwing } from './variants.mjs';

const env = (name) => {
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};
const LOOP_N = env('LOOP_N');
const THROW_N = env('THROW_N');
const ROUNDS = env('ROUNDS');
const WARMUP = env('WARMUP');

const VARIANTS = [
  { name: 'plain', fn: plain, n: LOOP_N },
  { name: 'guarded', fn: guarded, n: LOOP_N },
  { name: 'throwing', fn: throwing, n: THROW_N },
  { name: 'throw_object', fn: throwObject, n: THROW_N },
];

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const timeOnce = ({ fn, n }) => {
  const start = process.hrtime.bigint();
  const result = fn(n);
  const ns = Number(process.hrtime.bigint() - start);
  return { nsPerOp: ns / n, result };
};

const raw = Object.fromEntries(VARIANTS.map((v) => [v.name, []]));
const checksums = {};
for (let round = 0; round < WARMUP + ROUNDS; round++) {
  // Rotate the order every round so no variant always runs first.
  const order = VARIANTS.map((_, i) => VARIANTS[(i + round) % VARIANTS.length]);
  for (const v of order) {
    const { nsPerOp, result } = timeOnce(v);
    checksums[v.name] = result;
    if (round >= WARMUP) raw[v.name].push(nsPerOp);
  }
}

const expected = (n) => {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += i & 7;
  return sum;
};
for (const v of VARIANTS) {
  if (checksums[v.name] !== expected(v.n)) throw new Error(`${v.name} returned ${checksums[v.name]}, expected ${expected(v.n)}`);
}

const nsPerOp = Object.fromEntries(VARIANTS.map((v) => [v.name, median(raw[v.name])]));
const paired = raw.guarded.map((g, i) => (g / raw.plain[i] - 1) * 100);
console.log(JSON.stringify({
  runtime: 'node',
  version: process.version,
  v8: process.versions.v8,
  stack_trace_limit: Error.stackTraceLimit,
  loop_n: LOOP_N,
  throw_n: THROW_N,
  rounds: ROUNDS,
  warmup: WARMUP,
  ns_per_op: nsPerOp,
  try_overhead_pct: median(paired),
  try_overhead_pct_runs: paired,
  throw_cost_ns: nsPerOp.throwing - nsPerOp.plain,
  throw_object_cost_ns: nsPerOp.throw_object - nsPerOp.plain,
  checksums,
  raw_ns_per_op: raw,
}));
