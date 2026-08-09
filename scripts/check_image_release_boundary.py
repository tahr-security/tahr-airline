#!/usr/bin/env python3
"""Inspect application image layers for excluded public-release material."""

from __future__ import annotations

import io
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

from check_public_release_boundary import MARKERS, prohibited_path


def check_layer(layer: tarfile.ExFileObject, findings: list[str]) -> None:
    with tarfile.open(fileobj=layer, mode="r|") as archive:
        for member in archive:
            normalized = member.name.removeprefix("./")
            if prohibited_path(normalized):
                findings.append(f"{normalized}: prohibited path in image layer")
            pure_path = PurePosixPath(normalized)
            if (
                member.isfile()
                and member.size <= 2_000_000
                and pure_path.parts[:2] == ("app", "backend")
            ):
                extracted = archive.extractfile(member)
                if extracted is None:
                    continue
                contents = extracted.read().decode("utf-8", errors="ignore")
                if any(marker in contents for marker in MARKERS):
                    findings.append(f"{normalized}: prohibited marker in image layer")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: check_image_release_boundary.py <image>", file=sys.stderr)
        return 2
    image = sys.argv[1]
    findings: list[str] = []
    with tempfile.TemporaryDirectory(prefix="tahr-image-boundary-") as temporary:
        archive_path = Path(temporary) / "image.tar"
        subprocess.run(
            ["docker", "save", "--output", str(archive_path), image],
            check=True,
        )
        with tarfile.open(archive_path, mode="r") as image_archive:
            for member in image_archive:
                if not member.isfile() or not member.name.endswith("/layer.tar"):
                    continue
                layer = image_archive.extractfile(member)
                if layer is None:
                    continue
                layer_bytes = io.BytesIO(layer.read())
                check_layer(layer_bytes, findings)
    if findings:
        for finding in sorted(set(findings)):
            print(f"image-boundary: {finding}", file=sys.stderr)
        return 1
    print("Application image layer boundary check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
