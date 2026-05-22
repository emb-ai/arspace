<p align="center">
  <img src="assets/logo.png" alt="arspace"/>
</p>

<p align="center">
  Turn static posters into interactive AR experiences with video overlays. The project works directly in the browser.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#customization">Customization</a> •
  <a href="#deployment">Deployment</a>
</p>

---

Existing augmented reality (AR) solutions often require users to download special apps, which creates friction. This project runs entirely in the browser using WebAR technology, making it more easy to view your augmented posters by simply visiting a URL.


## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/arspace.git
   cd arspace
   ```

## Project Structure

```
arspace/
├── index.html              # Main entry point
├── css/
│   └── styles.css          # UI styles
├── js/
│   └── app.js              # AR application logic
├── assets/
│   ├── logo.png            # Project logo
│   ├── targets/
│   │   └── targets.mind    # Compiled AR target data
│   └── media/              # Videos and reference images
│       ├── food.mp4        # Video content
│       ├── food.jpg        # Target image reference
│       └── ...
├── tools/                  # Development utilities
│   ├── optimize-images.py  # Image compression script
│   └── optimize-videos.py  # Video compression script
└── docs/                   # Additional documentation
    └── hosting-regru.md    # Hosting guide (Russian)
```

## How It Works

1. User opens the website on their phone
2. Camera permission is requested
3. MindAR library scans the camera feed for target images
4. When a target is detected, the corresponding video plays as an overlay


## Customization

### Adding Your Own Content

1. **Prepare your media**
   - Create videos for each target (MP4, reasonable size)
   - Create reference images (JPG) — typically the first frame of each video

2. **Optimize files** (recommended for faster loading)
   ```bash
   # Compress images
   python3 tools/optimize-images.py ./assets/media --max-width 800 --quality 85
   
   # Compress videos
   python3 tools/optimize-videos.py ./assets/media --crf 28 --max-width 720
   ```

3. **Compile target images**
   
   Use the [MindAR Compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile/) to generate a `.mind` file from your target images. Save it as `assets/targets/targets.mind`.

4. **Update configuration**
   
   Edit `js/app.js` to point to your media files:
   ```javascript
   const TARGETS = [
     { video: "./assets/media/your-video.mp4", image: "./assets/media/your-image.jpg" },
     // Add more targets...
   ];
   ```


## Deployment

### Requirements

- HTTPS is **required** for camera access (except localhost)
- SSL certificate must be valid

### Static Hosting Options

arspace can be deployed to any static hosting service:

- **GitHub Pages** — Free, easy setup with GitHub
- **Netlify** — Free tier available, drag-and-drop deploy
- **Vercel** — Free tier, automatic deployments
- **Any web hosting** — Upload files via FTP/SFTP

### File Upload

Upload all files maintaining the folder structure:
```
your-domain.com/
├── index.html
├── css/
├── js/
└── assets/
```

> 📖 **Russian hosting guide**: See [docs/hosting-regru.md](docs/hosting-regru.md) for detailed instructions on hosting with reg.ru.
