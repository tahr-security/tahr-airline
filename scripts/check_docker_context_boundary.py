#!/usr/bin/env python3
"""Prove private-material patterns are absent from effective Docker context."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SENTINELS = (
    Path("answer-key/context-sentinel.txt"),
    Path("answer-keys/context-sentinel.txt"),
    Path("private-evaluation/context-sentinel.txt"),
    Path("vulnerability-manifest.private.context-sentinel"),
    Path("exploit-notes.private.context-sentinel"),
)


def main() -> int:
    existing = [str(path) for path in SENTINELS if (ROOT / path).exists()]
    if existing:
        raise RuntimeError("Refusing to overwrite existing boundary sentinel paths")

    created_directories: set[Path] = set()
    try:
        for relative in SENTINELS:
            destination = ROOT / relative
            if destination.parent != ROOT:
                destination.parent.mkdir(parents=True, exist_ok=False)
                created_directories.add(destination.parent)
            destination.write_text("harmless context exclusion sentinel\n", encoding="utf-8")

        with tempfile.TemporaryDirectory(prefix="tahr-context-boundary-") as temporary:
            temporary_path = Path(temporary)
            dockerfile = temporary_path / "Dockerfile"
            output = temporary_path / "output"
            dockerfile.write_text("FROM scratch\nCOPY . /context\n", encoding="utf-8")
            subprocess.run(
                [
                    "docker",
                    "buildx",
                    "build",
                    "--file",
                    str(dockerfile),
                    "--output",
                    f"type=local,dest={output}",
                    str(ROOT),
                ],
                check=True,
            )
            leaked = [
                str(relative)
                for relative in SENTINELS
                if (output / "context" / relative).exists()
            ]
            if leaked:
                raise RuntimeError("Private-material sentinel entered Docker context")
    finally:
        for relative in SENTINELS:
            (ROOT / relative).unlink(missing_ok=True)
        for directory in sorted(created_directories, reverse=True):
            shutil.rmtree(directory, ignore_errors=True)

    print("Effective Docker context boundary check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
