# Development tools

## Quick examples

From the project root:

```bash
# Generate manifest.json (run after adding/changing media files)
python3 tools/generate-manifest.py

# Compress poster reference images (JPG/PNG/WebP)
python3 tools/optimize-images.py ./assets/media --max-width 800 --quality 85

# Compress AR overlay videos (requires ffmpeg)
python3 tools/optimize-videos.py ./assets/media --crf 28 --max-width 720
```

Install dependencies once:

```bash
pip install Pillow
brew install ffmpeg   # macOS; or apt install ffmpeg on Linux
```

---

## Scripts

### `generate-manifest.py`

Scans `assets/media/` for video/image pairs and generates `assets/manifest.json` that `app.js` loads at startup. This eliminates the need to manually edit JavaScript when adding or removing targets.

**Run after:**
- Adding new video/image pairs to `assets/media/`
- Replacing or optimizing existing files
- Updating `assets/targets/targets.mind`

The script matches videos (`.mp4`) with images (`.jpg`, `.png`, `.webp`) by filename — e.g., `poster.mp4` pairs with `poster.jpg`. Targets are listed in **alphabetical order by video filename** (same as sorting files in `assets/media/`).

When you compile `assets/targets/targets.mind` in the [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile/), upload the matching reference images in that same alphabetical order so anchor index 0, 1, 2… matches the manifest.

### `optimize-images.py`

Resizes and re-encodes images in a folder to reduce file size for faster mobile loading. Supports `.jpg`, `.jpeg`, `.png`, and `.webp`. Writes results to `<input_dir>/optimized` by default (or `--output-dir`), preserving subfolder layout. Prints per-file and total size savings.

| Option | Default | Description |
|--------|---------|-------------|
| `input_dir` | — | Folder with source images |
| `--output-dir` | `<input>/optimized` | Where to write compressed files |
| `--quality` | `75` | JPG/WebP quality (1–95) |
| `--max-width` | none | Max output width (keeps aspect ratio) |
| `--max-height` | none | Max output height (keeps aspect ratio) |

### `optimize-videos.py`

Re-encodes videos with H.264 (AAC audio) via **ffmpeg** to shrink MP4s used as AR overlays. Outputs `.mp4` files to `<input_dir>/optimized_videos` by default. Uses `+faststart` so playback can start before the full file downloads.

| Option | Default | Description |
|--------|---------|-------------|
| `input_dir` | — | Folder with source videos |
| `--output-dir` | `<input>/optimized_videos` | Where to write compressed files |
| `--crf` | `28` | x264 quality (lower = better/larger) |
| `--preset` | `medium` | Encoding speed vs compression |
| `--max-width` | none | Max video width in pixels |
| `--audio-bitrate` | `96k` | AAC audio bitrate |

Supported inputs: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`.

After running either script, copy the optimized files into `assets/media/` (or replace originals), then regenerate the manifest:

```bash
python3 tools/generate-manifest.py
```
