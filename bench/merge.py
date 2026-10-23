"""Combines the per-runtime summaries into one file with the machine and date."""
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone


def cpu() -> str:
    try:
        return subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return platform.processor() or "unknown"


def main() -> None:
    paths = [a for a in sys.argv[1:] if not a.startswith("--")]
    smoke = any(a == "--smoke=1" for a in sys.argv[1:])
    node, py314, py310 = (json.load(open(p)) for p in paths)
    for summary, want in ((py314, "3.14"), (py310, "3.10")):
        if not summary["version"].startswith(want + "."):
            raise SystemExit(f"expected Python {want}, got {summary['version']}")
    json.dump({
        "smoke": smoke,
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cpu": cpu(),
        "os": f"{platform.system()} {platform.release()}",
        "node": node,
        "python": {"3.14": py314, "3.10": py310},
    }, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
