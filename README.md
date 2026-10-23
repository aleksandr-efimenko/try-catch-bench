# try-catch-bench

Does `try`/`catch` make code slow? A hot loop timed three ways in Node and Python: plain, inside a `try` that never throws, and throwing and catching on every pass.

## Results (Apple M1 Pro, Darwin 25.6.0)

| | Node v24.21.0 | Python 3.14.7 | Python 3.10.1 |
|---|---|---|---|
| plain loop, ns per pass | 0.61 | 23.3 | 45.6 |
| inside a `try`, nothing thrown | +0.0% | +0.8% | +4.2% |
| one throw and catch, ns added | 1,439 | 86 | 89 |

- A Node throw of `new Error` costs about 2,375 plain passes; throwing a plain object `{ code: 1 }` adds 69 ns, so most of the cost is the stack trace.
- Python 3.10.1 runs POP_BLOCK, SETUP_FINALLY on every pass through a `try`; Python 3.14.7 runs NOP (zero-cost exceptions, 3.11).
- Node's `try` overhead is indistinguishable from noise: the nine per-round differences range from -0.9% to +0.8%.

## Method

10,000,000 passes per run (1,000,000 for the throwing loops), 9 measured rounds after 2 warm-up rounds, variant order rotated every round, the middle result reported. Every variant returns the same checksum. Raw per-round timings are in `data/trycatch.json`.

## Caveats

- The loop body is deliberately tiny, which is the worst case for `try`: any overhead would show.
- The guarded loop body cannot throw, so V8 may drop the `try` entirely. That also holds for real code whose body doesn't throw; the throwing variants show the handler works.
- The throw is caught in the same function, the shallowest stack. Deeper stacks make a Node `Error` costlier, up to `Error.stackTraceLimit` (10) frames.
- Python's JIT is off (the default build). One machine, one run: treat the figures as relative.

## Run it

Needs Node v24.21.0, [uv](https://docs.astral.sh/uv/) and Python 3.14 and 3.10. `measure.sh` expects Node at `$HOME/.nvm/versions/node/v24.21.0/bin/node`; edit `NODE_BIN` if yours lives elsewhere.

```bash
bash measure.sh            # about a minute; rewrites data/trycatch.json
SMOKE=1 bash measure.sh    # tiny sizes, a few seconds, writes data/trycatch.smoke.json
```
