// Preload for run.mjs that records the stack trace V8 captured for the first `new Error` the benchmark threw.
// usage (from this folder): LOOP_N=8 THROW_N=1 ROUNDS=1 WARMUP=1 STACK_OUT=../data/stack.json \
//   ~/.nvm/versions/node/v24.21.0/bin/node --import ./stack_trace.mjs run.mjs > /dev/null
// It only observes: the subclass passes the message through and run.mjs still checks every checksum.
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.STACK_OUT;
if (!OUT) {
  throw new Error('STACK_OUT must name the JSON file to write');
}
const NativeError = globalThis.Error;
let recorded = null;

const frameOf = (site) => ({
  fn: site.getFunctionName() ?? '<module>',
  file: site.getFileName() ? path.basename(site.getFileName()) : null,
  line: site.getLineNumber(),
  column: site.getColumnNumber(),
});

class RecordingError extends NativeError {
  constructor(message, options) {
    super(message, options);
    if (recorded) {
      return;
    }
    const previous = NativeError.prepareStackTrace;
    NativeError.prepareStackTrace = (_err, sites) => sites;
    // Same capture a native Error makes (up to Error.stackTraceLimit frames), starting at the throw site.
    const holder = {};
    NativeError.captureStackTrace(holder, new.target);
    const sites = holder.stack;
    NativeError.prepareStackTrace = previous;
    const frames = sites.map(frameOf);
    // Only the benchmark's own throw counts, not run.mjs's argument checks.
    if (frames[0]?.file !== 'variants.mjs') {
      return;
    }
    // The same frames as V8 formats them for `err.stack`, with this folder's absolute path removed.
    const printed = {};
    NativeError.captureStackTrace(printed, new.target);
    const benchDir = `file://${path.dirname(new URL(import.meta.url).pathname)}/`;
    const lines = printed.stack.split('\n').slice(1).map((l) => l.trim().replaceAll(benchDir, ''));
    recorded = { message, stack_trace_limit: NativeError.stackTraceLimit, frames, lines };
  }
}
globalThis.Error = RecordingError;

process.on('exit', () => {
  if (!recorded) {
    throw new NativeError('run.mjs threw no Error; nothing recorded');
  }
  fs.writeFileSync(OUT, `${JSON.stringify({ node: process.version, ...recorded }, null, 2)}\n`);
});
