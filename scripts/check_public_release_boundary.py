#!/usr/bin/env python3
"""Reject private evaluation material from public source and artifacts."""

from __future__ import annotations

import argparse
import fnmatch
import os
import subprocess
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
SELF = "scripts/check_public_release_boundary.py"
PROHIBITED_DIRECTORIES = frozenset(
    {"answer-key", "answer-keys", "private-evaluation"}
)
PROHIBITED_FILE_PATTERNS = (
    "vulnerability-manifest.private.*",
    "exploit-notes.private.*",
)
REQUIRED_IGNORE_RULES = (
    "answer-key/",
    "answer-keys/",
    "private-evaluation/",
    "vulnerability-manifest.private.*",
    "exploit-notes.private.*",
)
MARKERS = tuple(
    "".join(parts)
    for parts in (
        ("internal", "VulnerabilityId:"),
        ("safe", "Reproduction:"),
        ("expected", "VulnerableResult:"),
        ("evaluation", "Hints:"),
        ("scoring", "Criteria:"),
    )
)
PROHIBITED_PATH_REFERENCES = (
    "answer-key/",
    "answer-keys/",
    "private-evaluation/",
    "vulnerability-manifest.private.",
    "exploit-notes.private.",
)
PRUNED_DIRECTORIES = frozenset(
    {
        ".git",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".ty",
        ".venv",
        "__pycache__",
        "backend/app/frontend",
        "coverage",
        "dist",
        "node_modules",
        "playwright-report",
        "test-results",
    }
)


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=check,
        capture_output=True,
        text=True,
    )


def prohibited_path(path: str) -> bool:
    normalized = path.replace("\\", "/").removeprefix("./")
    pure_path = PurePosixPath(normalized)
    if any(part.lower() in PROHIBITED_DIRECTORIES for part in pure_path.parts):
        return True
    return any(
        fnmatch.fnmatch(pure_path.name.lower(), pattern)
        for pattern in PROHIBITED_FILE_PATTERNS
    )


def iter_worktree_paths() -> list[str]:
    paths: list[str] = []
    for directory, directory_names, file_names in os.walk(ROOT):
        relative_directory = Path(directory).relative_to(ROOT).as_posix()
        kept_directories: list[str] = []
        for name in directory_names:
            relative = name if relative_directory == "." else f"{relative_directory}/{name}"
            paths.append(relative)
            if relative not in PRUNED_DIRECTORIES and name not in PRUNED_DIRECTORIES:
                kept_directories.append(name)
        directory_names[:] = kept_directories
        for name in file_names:
            relative = name if relative_directory == "." else f"{relative_directory}/{name}"
            paths.append(relative)
    return paths


def current_source_paths() -> list[str]:
    result = git("ls-files", "--cached", "--others", "--exclude-standard", "-z")
    return [path for path in result.stdout.split("\0") if path]


def contains_marker(path: Path) -> bool:
    try:
        if path.stat().st_size > 2_000_000:
            return False
        contents = path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeError):
        return False
    return any(marker in contents for marker in MARKERS)


def artifact_contains_prohibited_material(path: Path) -> bool:
    try:
        contents = path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeError):
        return False
    normalized = contents.replace("\\", "/").lower()
    return any(marker in contents for marker in MARKERS) or any(
        reference in normalized for reference in PROHIBITED_PATH_REFERENCES
    )


def check_ignore_rules(findings: list[str]) -> None:
    for relative in (".gitignore", ".dockerignore"):
        rules = set((ROOT / relative).read_text(encoding="utf-8").splitlines())
        for required in REQUIRED_IGNORE_RULES:
            if required not in rules:
                findings.append(f"{relative}: missing required private-material exclusion")


def check_current_tree(findings: list[str]) -> None:
    for relative in iter_worktree_paths():
        if prohibited_path(relative):
            findings.append(f"{relative}: prohibited private-material path")
    for relative in current_source_paths():
        if relative != SELF and contains_marker(ROOT / relative):
            findings.append(f"{relative}: prohibited structured private marker")


def check_history(findings: list[str]) -> None:
    objects = git("rev-list", "--objects", "--all").stdout.splitlines()
    for entry in objects:
        _, separator, path = entry.partition(" ")
        if separator and prohibited_path(path):
            findings.append(f"{path}: prohibited path exists in Git history")

    commits = git("rev-list", "--all").stdout.splitlines()
    grep_args = ["grep", "-I", "-n", "-F"]
    for marker in MARKERS:
        grep_args.extend(("-e", marker))
    for commit in commits:
        result = git(*grep_args, commit, "--", ".", check=False)
        if result.returncode not in (0, 1):
            raise RuntimeError(result.stderr.strip() or "git grep failed")
        for line in result.stdout.splitlines():
            _, separator, remainder = line.partition(":")
            path, second_separator, _ = remainder.partition(":")
            if separator and second_separator and path != SELF:
                findings.append(f"{path}: prohibited marker exists in Git history")


def check_artifacts(paths: list[str], findings: list[str]) -> None:
    for raw_path in paths:
        path = Path(raw_path).resolve()
        if not path.is_file():
            findings.append(f"{raw_path}: requested artifact is missing")
        elif prohibited_path(path.name) or artifact_contains_prohibited_material(path):
            findings.append(f"{raw_path}: prohibited private material in artifact")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", action="append", default=[])
    arguments = parser.parse_args()
    findings: list[str] = []
    check_ignore_rules(findings)
    check_current_tree(findings)
    check_history(findings)
    check_artifacts(arguments.artifact, findings)
    if findings:
        for finding in sorted(set(findings)):
            print(f"release-boundary: {finding}", file=sys.stderr)
        return 1
    print("Public release boundary check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
