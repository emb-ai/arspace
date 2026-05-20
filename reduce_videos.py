#!/usr/bin/env python3
import argparse
import subprocess
import shutil
from pathlib import Path


SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def format_bytes(num_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(num_bytes)
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            return f"{value:.2f} {unit}"
        value /= 1024.0
    return f"{num_bytes} B"


def compress_video(
    src_path: Path,
    dst_path: Path,
    crf: int,
    preset: str,
    max_width: int | None,
    audio_bitrate: str,
) -> tuple[int, int]:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    original_size = src_path.stat().st_size

    vf = None
    if max_width:
        # Keep aspect ratio and force even dimensions for codec compatibility.
        vf = f"scale='min(iw,{max_width})':-2"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src_path),
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-c:a",
        "aac",
        "-b:a",
        audio_bitrate,
        "-movflags",
        "+faststart",
    ]
    if vf:
        cmd.extend(["-vf", vf])
    cmd.append(str(dst_path))

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed for {src_path}\n"
            f"stderr:\n{result.stderr[-2000:]}"
        )

    new_size = dst_path.stat().st_size
    return original_size, new_size


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reduce video sizes in a folder and print size changes."
    )
    parser.add_argument("input_dir", type=Path, help="Folder with source videos")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output folder (default: <input_dir>/optimized_videos)",
    )
    parser.add_argument(
        "--crf",
        type=int,
        default=28,
        help="CRF quality for x264 (lower=better/larger). Default: 28",
    )
    parser.add_argument(
        "--preset",
        type=str,
        default="medium",
        choices=["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower"],
        help="x264 preset. Default: medium",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=None,
        help="Optional max video width in pixels (keeps aspect ratio)",
    )
    parser.add_argument(
        "--audio-bitrate",
        type=str,
        default="96k",
        help="Audio bitrate. Default: 96k",
    )
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        raise SystemExit(
            "ffmpeg is not installed or not in PATH.\n"
            "Install it first, then rerun:\n"
            "  macOS (Homebrew): brew install ffmpeg\n"
            "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y ffmpeg"
        )

    input_dir = args.input_dir.resolve()
    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input folder does not exist: {input_dir}")

    output_dir = args.output_dir.resolve() if args.output_dir else input_dir / "optimized_videos"

    videos = [
        p for p in input_dir.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    if not videos:
        raise SystemExit("No supported videos found.")

    total_original = 0
    total_new = 0

    print(f"Processing {len(videos)} video(s)...\n")
    for src_path in videos:
        rel_path = src_path.relative_to(input_dir)
        dst_path = output_dir / rel_path.with_suffix(".mp4")
        original_size, new_size = compress_video(
            src_path=src_path,
            dst_path=dst_path,
            crf=args.crf,
            preset=args.preset,
            max_width=args.max_width,
            audio_bitrate=args.audio_bitrate,
        )
        total_original += original_size
        total_new += new_size
        delta = original_size - new_size
        pct = (delta / original_size * 100) if original_size else 0.0
        print(
            f"{rel_path}: {format_bytes(original_size)} -> {format_bytes(new_size)} "
            f"({pct:+.1f}%)"
        )

    total_delta = total_original - total_new
    total_pct = (total_delta / total_original * 100) if total_original else 0.0
    print("\nSummary")
    print(f"Original total: {format_bytes(total_original)}")
    print(f"New total:      {format_bytes(total_new)}")
    print(f"Saved:          {format_bytes(total_delta)} ({total_pct:.1f}%)")
    print(f"Output folder:  {output_dir}")


if __name__ == "__main__":
    main()
