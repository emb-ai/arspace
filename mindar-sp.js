import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const CONFIG = {
  defaultMindTarget: "./targets/targets.mind",
  planeWidth: 1, 
};

const TARGETS = [
  { video: "./videos/food.mp4", image: "./videos/food.jpg" },
  { video: "./videos/car.mp4", image: "./videos/car.jpg" },
  { video: "./videos/coffee.mp4", image: "./videos/coffee.jpg" },
  { video: "./videos/method.mp4", image: "./videos/method.jpg" },
];

const isMobileDevice =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const MAX_PIXEL_RATIO = isMobileDevice ? 1.3 : window.devicePixelRatio;

const ui = queryUI();
attachInteractionHandlers(ui);

if (isMobileDevice) {
  showStatus(ui, "Tap to start the camera", { showButton: true });
} else {
  startMindAR(ui);
}

function queryUI() {
  return {
    statusOverlay: document.getElementById("statusOverlay"),
    statusText: document.getElementById("statusText"),
    loader: document.getElementById("loader"),
    arContainer: document.getElementById("ar-container"),
    tapStart: document.getElementById("tapStart"),
    stage: document.querySelector(".stage"),
  };
}

function showStatus(uiRefs, message, { showLoader = false, showButton = false } = {}) {
  uiRefs.loader.style.display = showLoader ? "block" : "none";
  uiRefs.tapStart.style.display = showButton ? "inline-block" : "none";
  uiRefs.statusText.innerHTML = message;
  uiRefs.statusOverlay.classList.add("show");
}

function hideStatus(uiRefs) {
  uiRefs.statusOverlay.classList.remove("show");
}

async function startMindAR(uiRefs) {
  try {
    showStatus(uiRefs, "Starting camera...", { showLoader: true });

    const mindarThree = new MindARThree({
      container: uiRefs.arContainer,
      imageTargetSrc: CONFIG.defaultMindTarget,
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
    
    const videos = createVideos();
    
    const videosReadyPromise = prepareVideos(videos);
    const targetImagesPromise = loadTargetImages();
    
    console.log("Starting MindAR...");
    await mindarThree.start();
    console.log("MindAR started, camera active");

    // At this point MindAR has created its internal <video> for the camera.
    // Because you don't have console access, we use on-screen messages to
    // confirm whether camera frames are really coming through.
    showStatus(uiRefs, "Waiting for camera input...", { showLoader: true });

    const startTime = Date.now();
    const checkInterval = 300;

    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const cameraVideo = uiRefs.arContainer.querySelector("video");

        if (!cameraVideo) {
          // MindAR hasn't attached the video element yet
          if (Date.now() - startTime > 7000) {
            clearInterval(timer);
            reject(new Error("Не удалось создать видео-поток камеры. Возможно, устройство или браузер не поддерживаются MindAR."));
          }
          return;
        }

        const ready = cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0;

        if (ready) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - startTime > 7000) {
          clearInterval(timer);
          reject(new Error("Camera is allowed, but the video frame does not appear. Try another browser or device."));
        }
      }, checkInterval);
    });

    showStatus(uiRefs, "Loading video...", { showLoader: true });
    await videosReadyPromise;
    const targetImages = await targetImagesPromise;
    console.log("Videos and images loaded");

    const { anchors, videoTextures } = createAnchors({
      mindarThree,
      videos,
      targetImages,
    });

    configureAnimationLoop({ renderer, scene, camera, anchors, videos, videoTextures });

    hideStatus(uiRefs);
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
    
    showStatus(uiRefs, `<strong>AR Error:</strong> ${errorMsg}`);
  }
}

function createVideos() {
  return TARGETS.map((target) => {
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
    TARGETS.map(
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

  for (let i = 0; i < TARGETS.length; i++) {
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
    console.log(`Anchor ${i} created for: ${TARGETS[i].video}`);
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

  uiRefs.tapStart.addEventListener("click", () => {
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
