#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def format_bytes(num_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(num_bytes)
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            return f"{value:.2f} {unit}"
        value /= 1024.0
    return f"{num_bytes} B"


def process_image(
    src_path: Path,
    dst_path: Path,
    max_width: int | None,
    max_height: int | None,
    quality: int,
) -> tuple[int, int]:
    original_size = src_path.stat().st_size

    with Image.open(src_path) as img:
        img = img.convert("RGB") if src_path.suffix.lower() in {".jpg", ".jpeg"} else img

        if max_width or max_height:
            current_w, current_h = img.size
            w_limit = max_width if max_width else current_w
            h_limit = max_height if max_height else current_h
            ratio = min(w_limit / current_w, h_limit / current_h, 1.0)
            new_size = (int(current_w * ratio), int(current_h * ratio))
            if new_size != img.size:
                img = img.resize(new_size, Image.Resampling.LANCZOS)

        dst_path.parent.mkdir(parents=True, exist_ok=True)
        save_kwargs = {"optimize": True}
        if dst_path.suffix.lower() in {".jpg", ".jpeg", ".webp"}:
            save_kwargs["quality"] = quality
        img.save(dst_path, **save_kwargs)

    new_size = dst_path.stat().st_size
    return original_size, new_size


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reduce image sizes in a folder and print size changes."
    )
    parser.add_argument("input_dir", type=Path, help="Folder with source images")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output folder (default: <input_dir>/optimized)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=75,
        help="Quality for JPG/WEBP (1-95). Default: 75",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=None,
        help="Optional max output width in pixels",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=None,
        help="Optional max output height in pixels",
    )
    args = parser.parse_args()

    input_dir = args.input_dir.resolve()
    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input folder does not exist: {input_dir}")

    output_dir = args.output_dir.resolve() if args.output_dir else input_dir / "optimized"
    quality = max(1, min(args.quality, 95))

    image_paths = [
        p for p in input_dir.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    if not image_paths:
        raise SystemExit("No supported images found.")

    total_original = 0
    total_new = 0

    print(f"Processing {len(image_paths)} image(s)...\n")
    for src_path in image_paths:
        rel_path = src_path.relative_to(input_dir)
        dst_path = output_dir / rel_path
        original_size, new_size = process_image(
            src_path,
            dst_path,
            args.max_width,
            args.max_height,
            quality,
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
