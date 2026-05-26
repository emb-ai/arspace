<p align="center">
  <img src="assets/demo/logo.png" alt="arspace"/>
</p>

<p align="center">
  <i>Turn static posters into interactive AR experiences with video overlays. The project works directly in the browser.</i>
</p>

<p align="center">
  💡 <a href="#what-is-arspace">What is arspace?</a> &nbsp; • &nbsp;
  🚀 <a href="#quick-start">Quick Start</a> &nbsp; • &nbsp;
  🛠️ <a href="#customization">Customization</a> &nbsp; • &nbsp;
  🔍 <a href="#try-arspace">Try it</a> 
</p>

---

## What is arspace?

**arspace** is a lightweight tool designed to help researchers increase the visibility of their work at poster sessions—without relying on tablets taped to posters or external devices. Instead, you can attach interactive, animated content directly to your poster images. Viewers simply **scan the poster with their phone** and instantly see videos or animations on top of the printed material.

The entire system runs in the browser using WebAR technology, so there is nothing to install—just open a link and start exploring:

<p align="center">
  <img src="assets/demo/scheme.png" alt="arspace"/>
</p>


### Examples

Visitors scan the poster with their phone and see the projected video on the printout — no app install:

<p align="center">
  <img src="assets/demo/conference.png" alt="AR poster at conference" width="500"/>
  &nbsp;&nbsp;&nbsp;
  <img src="assets/demo/video.gif" alt="AR poster at conference" width="250"/>
</p>

<p align="center">
  <em>arspace in action at a conference — visitors scan the poster to see animated content</em>
</p>

---

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/emb-ai/arspace.git
   cd arspace
   ```


2. **Deploy the website**.
Deploy `arspace` to your preferred hosting provider. Upload all files while maintaining the existing folder structure (see [docs/hosting-regru.md](docs/hosting-regru.md) for detailed instructions on hosting with popular platform "reg.ru"):

```
your-domain.com/
├── index.html
├── css/
├── js/
└── assets/
```

> [!NOTE]
> To ensure mobile camera access works correctly: 1) use the `https://` prefix; 2) install a valid SSL certificate. Insecure websites will be blocked by phone security systems.


3. **Customize**.
Once the template works with the original media, replace the assets with your own content. Follow the step-by-step instructions in the [customization](#customization) section.



## Customization

### Adding Your Own Content

1. **Prepare your media**
   - Create videos for each target (MP4)
   - Create reference images (JPG) — same filename as the video (e.g., `poster.mp4` + `poster.jpg`)
   - Place both in `assets/media/`

2. **Optimize files** (recommended for faster loading)
   ```bash
   # Compress images
   python3 tools/optimize-images.py ./assets/media --max-width 800 --quality 85
   
   # Compress videos
   python3 tools/optimize-videos.py ./assets/media --crf 28 --max-width 720
   ```

3. **Compile target images**.
   Use the [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile/) to generate a `.mind` file from your target images. Save it as `assets/targets/targets.mind`.

> [!NOTE]
> **Important:** Upload the reference images to the compiler in **alphabetical order by filename**, the same order they appear in `assets/media/` (e.g. `car.jpg`, `coffee.jpg`, `food.jpg`, `method.jpg`). The manifest generator and the app use that order for anchor indices — if the compiler order does not match, scanning a poster will play the wrong video.

4. **Generate manifest**.
   Run the manifest generator to auto-detect all video/image pairs:
   ```bash
   python3 tools/generate-manifest.py
   ```
   
   This creates `assets/manifest.json` with all targets and file sizes — no need to edit JavaScript.


## Try arspace

**Use your phone** <i>(you will need it to scan the images below)</i>.  
Visit https://arspace.ru (make sure to include the `https://` prefix). Once the website opens, click **“START”**, grant camera access, and scan one of the images below to see the AR content appear directly on the image.

<p align="center">
  <img src="assets/demo/examples.png" alt="Examples of scannable poster images for arspace"/>
</p>
<p align="center">
  <b>Example images that can be added to a poster and scanned with arspace</b>
</p>


## Project Structure

```
arspace/
├── index.html                # Main entry point
├── css/
│   └── styles.css            # UI styles
├── js/
│   └── app.js                # AR application logic
├── assets/
│   ├── demo/                 # Demo images and video
│   ├── targets/
│   │   └── targets.mind      # Compiled AR target data
│   └── media/                # Videos and target images
│       ├── food.mp4        
│       ├── food.jpg        
│       └── ...
├── tools/                    # Development utilities
│   ├── optimize-images.py    # Image compression script
│   ├── optimize-videos.py    # Video compression script
│   └── generate-manifest.py  # Scans `assets/media/` for video/image pairs
└── docs/                     # Additional documentation
    └── hosting-regru.md      # Hosting guide (Russian)
```



## Acknowledgement
We highly appreciate the creators of [MindAR](https://github.com/hiukim/mind-ar-js). Their project provides the core image recognition and keypoint compilation features for this work.

