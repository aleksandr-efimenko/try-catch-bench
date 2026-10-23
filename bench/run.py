"""Times variants.py and prints one JSON summary. Sizes come from measure.sh via the environment."""
import dis
import json
import os
import platform
import statistics
import sys
import time
from collections import Counter

from variants import guarded, plain, throwing


def env(name: str) -> int:
    value = int(os.environ[name])
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


LOOP_N, THROW_N, ROUNDS, WARMUP = env("LOOP_N"), env("THROW_N"), env("ROUNDS"), env("WARMUP")
VARIANTS = [("plain", plain, LOOP_N), ("guarded", guarded, LOOP_N), ("throwing", throwing, THROW_N)]


def time_once(fn, n: int) -> tuple[float, int]:
    start = time.perf_counter_ns()
    result = fn(n)
    return (time.perf_counter_ns() - start) / n, result


def try_extra_ops() -> list[str]:
    """Instructions guarded() has that plain() lacks, outside the except handler (which never runs here)."""
    def ops(fn):
        handler_start = min((e.target for e in getattr(dis.Bytecode(fn), "exception_entries", [])), default=None)
        out = []
        for ins in dis.get_instructions(fn):
            if handler_start is not None and ins.offset >= handler_start:
                break
            if ins.opname == "DUP_TOP":  # 3.10: the except handler starts here
                break
            out.append(ins.opname)
        return Counter(out)
    return sorted((ops(guarded) - ops(plain)).elements())


def main() -> None:
    raw = {name: [] for name, _, _ in VARIANTS}
    checksums = {}
    for rnd in range(WARMUP + ROUNDS):
        # Rotate the order every round so no variant always runs first.
        for name, fn, n in VARIANTS[rnd % 3:] + VARIANTS[:rnd % 3]:
            ns, result = time_once(fn, n)
            checksums[name] = result
            if rnd >= WARMUP:
                raw[name].append(ns)
    for name, _, n in VARIANTS:
        expected = sum(i & 7 for i in range(n))
        if checksums[name] != expected:
            raise SystemExit(f"{name} returned {checksums[name]}, expected {expected}")
    ns_per_op = {k: statistics.median(v) for k, v in raw.items()}
    paired = [(g / p - 1) * 100 for g, p in zip(raw["guarded"], raw["plain"])]
    print(json.dumps({
        "runtime": "python",
        "version": platform.python_version(),
        "implementation": platform.python_implementation(),
        "jit_enabled": bool(getattr(getattr(sys, "_jit", None), "is_enabled", lambda: False)()),
        "loop_n": LOOP_N,
        "throw_n": THROW_N,
        "rounds": ROUNDS,
        "warmup": WARMUP,
        "ns_per_op": ns_per_op,
        "try_overhead_pct": statistics.median(paired),
        "try_overhead_pct_runs": paired,
        "throw_cost_ns": ns_per_op["throwing"] - ns_per_op["plain"],
        "try_extra_ops": try_extra_ops(),
        "checksums": checksums,
        "raw_ns_per_op": raw,
    }))


if __name__ == "__main__":
    main()
