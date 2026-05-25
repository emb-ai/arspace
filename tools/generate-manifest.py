#!/usr/bin/env python3
"""
Scans assets/media/ for video/image pairs and generates a manifest.json
that app.js uses for configuration. Run from project root:

    python3 tools/generate-manifest.py

The script looks for .mp4 files and matches them with .jpg images
that share the same base name (e.g., food.mp4 + food.jpg).
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = PROJECT_ROOT / "assets" / "media"
TARGETS_DIR = PROJECT_ROOT / "assets" / "targets"
OUTPUT_FILE = PROJECT_ROOT / "assets" / "manifest.json"

VIDEO_EXTENSIONS = {".mp4"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def find_matching_image(video_path: Path) -> Path | None:
    """Find an image file with the same base name as the video."""
    base_name = video_path.stem
    for ext in IMAGE_EXTENSIONS:
        candidate = video_path.parent / f"{base_name}{ext}"
        if candidate.exists():
            return candidate
    return None


def to_web_path(file_path: Path) -> str:
    """Convert absolute path to relative web path from project root."""
    rel = file_path.relative_to(PROJECT_ROOT)
    return "./" + str(rel).replace("\\", "/")


def main() -> None:
    if not MEDIA_DIR.exists():
        raise SystemExit(f"Media folder not found: {MEDIA_DIR}")

    videos = sorted(MEDIA_DIR.glob("*"))
    videos = [v for v in videos if v.suffix.lower() in VIDEO_EXTENSIONS]

    if not videos:
        raise SystemExit(f"No video files found in {MEDIA_DIR}")

    targets = []
    for video_path in videos:
        image_path = find_matching_image(video_path)
        if not image_path:
            print(f"Warning: No matching image for {video_path.name}, skipping")
            continue

        targets.append({
            "video": to_web_path(video_path),
            "image": to_web_path(image_path),
            "videoSize": video_path.stat().st_size,
            "imageSize": image_path.stat().st_size,
        })

    mind_file = TARGETS_DIR / "targets.mind"
    mind_size = mind_file.stat().st_size if mind_file.exists() else 0

    manifest = {
        "mindTarget": {
            "path": to_web_path(mind_file) if mind_file.exists() else "./assets/targets/targets.mind",
            "size": mind_size,
        },
        "targets": targets,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated {OUTPUT_FILE}")
    print(f"  - {len(targets)} target(s)")
    print(f"  - Mind file: {mind_size:,} bytes")
    total_video = sum(t["videoSize"] for t in targets)
    total_image = sum(t["imageSize"] for t in targets)
    print(f"  - Total video size: {total_video:,} bytes")
    print(f"  - Total image size: {total_image:,} bytes")


if __name__ == "__main__":
    main()
