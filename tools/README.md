# Development tools

## Quick examples

From the project root:

```bash
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

After running either script, copy the optimized files into `assets/media/` (or replace originals) and update sizes in `js/app.js` if you track them in `ASSET_SIZES`.
