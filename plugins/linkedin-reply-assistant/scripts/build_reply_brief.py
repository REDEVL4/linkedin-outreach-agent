from __future__ import annotations

import argparse
from pathlib import Path
import sys


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        print(f"Missing file: {path}", file=sys.stderr)
        raise SystemExit(1)


def main() -> None:
    plugin_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Build a structured LinkedIn reply brief from saved profile context."
    )
    parser.add_argument(
        "--mode",
        choices=["dm", "comment", "follow-up", "connection-reply"],
        default="dm",
        help="Type of LinkedIn response to draft.",
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Path to a text or markdown file containing the incoming message or post.",
    )
    parser.add_argument(
        "--goal",
        default="Write a helpful response that matches my voice.",
        help="What the reply should achieve.",
    )
    parser.add_argument(
        "--profile",
        default=str(plugin_root / "knowledge" / "profile.md"),
        help="Path to the saved profile context file.",
    )
    parser.add_argument(
        "--style",
        default=str(plugin_root / "knowledge" / "style-guide.md"),
        help="Path to the saved style guide file.",
    )
    args = parser.parse_args()

    target_path = Path(args.target).resolve()
    profile_path = Path(args.profile).resolve()
    style_path = Path(args.style).resolve()

    target_text = read_text(target_path)
    profile_text = read_text(profile_path)
    style_text = read_text(style_path)

    print(f"# LinkedIn Reply Brief ({args.mode})")
    print()
    print("## Goal")
    print(args.goal)
    print()
    print("## Incoming Content")
    print(target_text)
    print()
    print("## My Profile Context")
    print(profile_text)
    print()
    print("## Style Guide")
    print(style_text)


if __name__ == "__main__":
    main()
