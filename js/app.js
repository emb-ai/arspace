import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const CONFIG = {
  manifestPath: "./assets/manifest.json",
  planeWidth: 1, 
};

let manifest = null;
let targets = [];

const loadingState = {
  engine: { status: "loaded", label: "AR Engine Code", size: 2700000 },
  camera: { status: "pending", label: "Camera Access" },
  mindTarget: { status: "pending", label: "AR Target Data", size: 0 },
  videos: { status: "pending", label: "Videos", size: 0 },
  images: { status: "pending", label: "Reference Images", size: 0 },
};

const isMobileDevice =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const MAX_PIXEL_RATIO = isMobileDevice ? 1.3 : window.devicePixelRatio;

const ui = queryUI();
attachInteractionHandlers(ui);
updateLoadingUI(ui);
initApp();

async function initApp() {
  try {
    manifest = await fetchManifest();
    targets = manifest.targets;
    
    loadingState.mindTarget.size = manifest.mindTarget.size;
    loadingState.videos.size = targets.reduce((sum, t) => sum + (t.videoSize || 0), 0);
    loadingState.videos.label = `Videos`;
    loadingState.images.size = targets.reduce((sum, t) => sum + (t.imageSize || 0), 0);
    updateLoadingUI(ui);
    
    if (isMobileDevice) {
      showStatus(ui, "Tap to start the camera", { showButton: true, showProgress: true });
    } else {
      startMindAR(ui);
    }
  } catch (err) {
    console.error("Failed to load manifest:", err);
    showStatus(ui, `<strong>Config Error:</strong> ${err.message}`, { showProgress: true });
  }
}

async function fetchManifest() {
  const res = await fetch(CONFIG.manifestPath);
  if (!res.ok) throw new Error(`Failed to load ${CONFIG.manifestPath}`);
  return res.json();
}

function queryUI() {
  return {
    statusOverlay: document.getElementById("statusOverlay"),
    statusText: document.getElementById("statusText"),
    loader: document.getElementById("loader"),
    arContainer: document.getElementById("ar-container"),
    tapStart: document.getElementById("tapStart"),
    stage: document.querySelector(".stage"),
    loadingProgress: document.getElementById("loadingProgress"),
    loadingItems: document.getElementById("loadingItems"),
    loadingPercent: document.getElementById("loadingPercent"),
  };
}

function formatSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

function getStatusIcon(status) {
  switch (status) {
    case "loaded": return "✓";
    case "loading": return "◌";
    case "error": return "✗";
    default: return "○";
  }
}

function updateLoadingUI(uiRefs) {
  if (!uiRefs.loadingItems) return;
  
  const items = Object.entries(loadingState);
  const totalItems = items.length;
  const loadedItems = items.filter(([, v]) => v.status === "loaded").length;
  const percent = Math.round((loadedItems / totalItems) * 100);
  
  uiRefs.loadingItems.innerHTML = items.map(([key, item]) => `
    <div class="loading-item ${item.status}">
      <span class="loading-icon ${item.status}">${getStatusIcon(item.status)}</span>
      <span class="loading-label">${item.label}</span>
      ${item.size ? `<span class="loading-size">${formatSize(item.size)}</span>` : ""}
    </div>
  `).join("");
  
  uiRefs.loadingPercent.textContent = `${loadedItems}/${totalItems} (${percent}%)`;
}

function setLoadingStatus(key, status) {
  if (loadingState[key]) {
    loadingState[key].status = status;
    updateLoadingUI(ui);
    ui.statusOverlay.style.zIndex = "9999";
  }
}

function isAllLoaded() {
  return Object.values(loadingState).every(item => item.status === "loaded");
}

function hasAnyError() {
  return Object.values(loadingState).some(item => item.status === "error");
}

function showStatus(uiRefs, message, { showLoader = false, showButton = false, showProgress = false } = {}) {
  uiRefs.loader.style.display = showLoader ? "block" : "none";
  uiRefs.tapStart.style.display = showButton ? "inline-block" : "none";
  uiRefs.loadingProgress.style.display = showProgress ? "block" : "none";
  uiRefs.statusText.innerHTML = message;
  uiRefs.statusOverlay.classList.add("show");
  uiRefs.statusOverlay.style.zIndex = "9999";
  
  if (showProgress) {
    updateLoadingUI(uiRefs);
  }
}

function yieldToUI(ms = 0) {
  const delay = isMobileDevice ? Math.max(ms, 80) : Math.max(ms, 16);
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      setTimeout(resolve, delay);
    });
  });
}

function hideStatus(uiRefs) {
  uiRefs.statusOverlay.classList.remove("show");
}

async function startMindAR(uiRefs) {
  try {
    showStatus(uiRefs, "Loading assets...", { showLoader: true, showProgress: true });
    await yieldToUI(120);

    setLoadingStatus("images", "loading");
    await yieldToUI();
    const targetImagesPromise = loadTargetImages().then((images) => {
      setLoadingStatus("images", "loaded");
      return images;
    }).catch(() => {
      setLoadingStatus("images", "error");
      return [];
    });

    setLoadingStatus("videos", "loading");
    await yieldToUI();
    const videos = createVideos();
    const videosReadyPromise = prepareVideos(videos).then(() => {
      setLoadingStatus("videos", "loaded");
    }).catch(() => {
      setLoadingStatus("videos", "error");
    });

    const targetImages = await targetImagesPromise;
    await yieldToUI();
    await videosReadyPromise;
    await yieldToUI();

    setLoadingStatus("mindTarget", "loading");
    showStatus(uiRefs, "Initializing AR engine...", { showLoader: true, showProgress: true });
    await yieldToUI(120);

    const mindarThree = new MindARThree({
      container: uiRefs.arContainer,
      imageTargetSrc: manifest.mindTarget.path,
      uiScanning: false,
      uiLoading: false,
      uiError: false,
      filterMinCF: 0.0001,
      filterBeta: 0.001,
      rendererSettings: {
        antialias: false,
        powerPreference: "low-power",
        alpha: true,
      },
    });

    const { renderer, scene, camera } = mindarThree;
    renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio));

    setLoadingStatus("camera", "loading");
    showStatus(uiRefs, "Requesting camera...", { showLoader: true, showProgress: true });
    await yieldToUI(120);

    console.log("Starting MindAR...");
    await mindarThree.start();
    await yieldToUI();
    setLoadingStatus("mindTarget", "loaded");
    console.log("MindAR started, camera active");

    showStatus(uiRefs, "Waiting for camera...", { showLoader: true, showProgress: true });
    await yieldToUI();

    const startTime = Date.now();
    const checkInterval = 300;

    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const cameraVideo = uiRefs.arContainer.querySelector("video");

        if (!cameraVideo) {
          if (Date.now() - startTime > 7000) {
            clearInterval(timer);
            setLoadingStatus("camera", "error");
            reject(new Error("Не удалось создать видео-поток камеры. Возможно, устройство или браузер не поддерживаются MindAR."));
          }
          return;
        }

        const ready = cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0;

        if (ready) {
          clearInterval(timer);
          setLoadingStatus("camera", "loaded");
          resolve();
        } else if (Date.now() - startTime > 7000) {
          clearInterval(timer);
          setLoadingStatus("camera", "error");
          reject(new Error("Camera is allowed, but the video frame does not appear. Try another browser or device."));
        }
      }, checkInterval);
    });

    showStatus(uiRefs, "Finalizing...", { showLoader: true, showProgress: true });
    await yieldToUI();
    console.log("Videos and images loaded");

    const { anchors, videoTextures } = createAnchors({
      mindarThree,
      videos,
      targetImages,
    });

    configureAnimationLoop({ renderer, scene, camera, anchors, videos, videoTextures });

    if (isAllLoaded()) {
      showStatus(uiRefs, "Ready! Point camera at a target image.", { showProgress: true });
      setTimeout(() => hideStatus(uiRefs), 1500);
    } else if (hasAnyError()) {
      showStatus(uiRefs, "Some assets failed to load. AR may not work correctly.", { showProgress: true });
      setTimeout(() => hideStatus(uiRefs), 3000);
    } else {
      hideStatus(uiRefs);
    }
    console.log("MindAR started successfully");
  } catch (err) {
    console.error("MindAR failed:", err);
    let errorMsg = err?.message || (typeof err === "string" ? err : "");
    
    if (!errorMsg) {
      if (err?.name === "NotAllowedError") {
        errorMsg = "Camera access denied. Please allow camera permissions in your browser settings.";
      } else if (err?.name === "NotFoundError") {
        errorMsg = "No camera found on this device.";
      } else if (err?.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another application.";
      } else if (err?.name === "SecurityError" || err?.name === "InsecureContextError") {
        errorMsg = "HTTPS required. This site must be served over HTTPS for camera access.";
      } else if (err?.name) {
        errorMsg = `${err.name}: Camera or AR initialization failed.`;
      } else {
        const isHTTPS = location.protocol === "https:" || location.hostname === "localhost";
        if (!isHTTPS) {
          errorMsg = "HTTPS required. Camera access only works on HTTPS or localhost.";
        } else {
          errorMsg = "AR failed to start. Try refreshing or use a different browser.";
        }
      }
    }
    
    showStatus(uiRefs, `<strong>AR Error:</strong> ${errorMsg}`, { showProgress: true });
  }
}

function createVideos() {
  return targets.map((target) => {
    const video = document.createElement("video");
    video.classList.add("ar-video-source");

    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.muted = true;
    video.loop = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = target.video;

    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.visibility = "hidden";
    video.style.pointerEvents = "none";
    
    document.body.appendChild(video);
    video.load();

    return video;
  });
}

async function prepareVideos(videos) {
  await Promise.all(videos.map(waitForVideoReady));

  if (!isMobileDevice) return;

  for (const video of videos) {
    try {
      await video.play();
      video.pause();
      video.currentTime = 0;
    } catch (err) {
      console.warn("Video priming skipped:", err?.message || err);
    }
  }
}

function waitForVideoReady(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 2) {
      console.log("Video already ready:", video.src);
      return resolve();
    }

    const onCanPlay = () => {
      console.log("Video canplaythrough:", video.src);
      cleanup();
      resolve();
    };

    const onLoadedData = () => {
      console.log("Video loadeddata:", video.src);
      cleanup();
      resolve();
    };

    const onError = (e) => {
      console.warn("AR video failed to load:", video.src, e);
      cleanup();
      resolve();
    };

    const cleanup = () => {
      video.removeEventListener("canplaythrough", onCanPlay);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("canplaythrough", onCanPlay, { once: true });
    video.addEventListener("loadeddata", onLoadedData, { once: true });
    video.addEventListener("error", onError, { once: true });

    setTimeout(() => {
      console.warn("Video load timeout:", video.src, "readyState:", video.readyState);
      cleanup();
      resolve();
    }, 5000);
  });
}

async function loadTargetImages() {
  return Promise.all(
    targets.map(
      (target) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = target.image;
        })
    )
  );
}

function createAnchors({ mindarThree, videos, targetImages }) {
  const anchors = [];
  const videoTextures = [];

  for (let i = 0; i < targets.length; i++) {
    const video = videos[i];
    const targetImg = targetImages[i];
    const aspectFromImage =
      targetImg && targetImg.naturalWidth && targetImg.naturalHeight
        ? targetImg.naturalWidth / targetImg.naturalHeight
        : null;

    const targetAspect =
      aspectFromImage || video.videoWidth / video.videoHeight || 16 / 9;

    const planeHeight = CONFIG.planeWidth / targetAspect;
    console.log(
      `Target ${i}: image=${targetImg?.naturalWidth}x${targetImg?.naturalHeight}, aspect=${targetAspect.toFixed(
        3
      )}`
    );

    const geometry = new THREE.PlaneGeometry(CONFIG.planeWidth, planeHeight);
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.generateMipmaps = false;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const plane = new THREE.Mesh(geometry, material);
    const anchor = mindarThree.addAnchor(i);
    anchor.group.add(plane);

    anchor.onTargetFound = () => handleTargetFound({ video, videoTexture, index: i });
    anchor.onTargetLost = () => handleTargetLost({ video, index: i });

    anchors.push(anchor);
    videoTextures.push(videoTexture);
    console.log(`Anchor ${i} created for: ${targets[i].video}`);
  }

  return { anchors, videoTextures };
}

function handleTargetFound({ video, videoTexture, index }) {
  console.log(`Target ${index} found`);
  video.currentTime = 0;

  const playPromise = video.play();
  if (!playPromise) return;

  playPromise
    .then(() => {
      videoTexture.needsUpdate = true;
      hideStatus(ui);
    })
    .catch((err) => {
      console.warn("Video play rejected:", err);
      showStatus(ui, "Tap screen to play video");
    });
}

function handleTargetLost({ video, index }) {
  console.log(`Target ${index} lost`);
  video.pause();
}

function configureAnimationLoop({ renderer, scene, camera, anchors, videos, videoTextures }) {
  renderer.setAnimationLoop(() => {
    updateVideoTextures(videos, videoTextures);
    renderer.render(scene, camera);
  });
}

function updateVideoTextures(videos, videoTextures) {
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (video && !video.paused && video.readyState >= 2) {
      videoTextures[i].needsUpdate = true;
    }
  }
}

function attachInteractionHandlers(uiRefs) {
  uiRefs.statusOverlay.addEventListener("click", (event) => {
    if (event.target === uiRefs.tapStart) return;
    tryPlayAllVideos();
  });

  uiRefs.stage.addEventListener("click", tryPlayAllVideos);

  uiRefs.tapStart.addEventListener("click", (event) => {
    event.stopPropagation();
    uiRefs.tapStart.style.display = "none";
    startMindAR(uiRefs);
  });
}

async function tryPlayAllVideos() {
  const videos = Array.from(document.querySelectorAll("#ar-container video"));
  for (const [index, video] of videos.entries()) {
    if (video && video.paused) {
      try {
        await video.play();
      } catch (err) {
        console.warn(`Tap could not start video ${index}:`, err);
      }
    }
  }
  hideStatus(ui);
}
