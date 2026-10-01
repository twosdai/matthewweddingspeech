// Click counts at which the face advances to the next image (faces 1..9).
// Past the last threshold, the face cycles on every click.
const FACE_THRESHOLDS = [0, 5, 15, 30, 50, 75, 100, 150, 200];

// Milestone messages, each shown once when the count lands on the key.
const MILESTONES = {
  10: "He’s definitely 16.",
  25: "Please. He’s getting married today.",
  50: "Have you considered Taco Bell?",
  100: "But that is floor burrito.",
  150: "Just never piss dude.",
  200: "Riding home on the rims.",
  500: "Ride or die.",
  1000: "Lets all have a toast to them!",
};

const FACE_COUNT = 9;
const FACE_SRCS = Array.from(
  { length: FACE_COUNT },
  (_, i) => `images/faces/face-${String(i + 1).padStart(2, "0")}.jpg`
);

const STORAGE_KEY = "matthew-clicks";
const MUTE_KEY = "matthew-clicks-muted";
const TOAST_MS = 2800;

// Holds preloaded face images so they are not garbage collected.
let preloaded = [];

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode, blocked); the game still works.
  }
}

function faceIndexFor(count) {
  const last = FACE_THRESHOLDS[FACE_THRESHOLDS.length - 1];
  if (count >= last) {
    return (FACE_THRESHOLDS.length - 1 + (count - last)) % FACE_COUNT;
  }
  let index = 0;
  for (let i = 0; i < FACE_THRESHOLDS.length; i += 1) {
    if (count >= FACE_THRESHOLDS[i]) index = i;
  }
  return Math.min(index, FACE_COUNT - 1);
}

function createPopSound() {
  let ctx = null;

  function ensureContext() {
    if (ctx) return ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    return ctx;
  }

  // Must run inside a user-activation gesture (click) so touch devices get sound.
  function unlock() {
    try {
      const audio = ensureContext();
      if (audio && audio.state === "suspended") audio.resume().catch(() => {});
    } catch {
      // Audio is optional.
    }
  }

  function play() {
    try {
      if (!ensureContext()) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio is a garnish; never let it break a click.
    }
  }

  return { play, unlock };
}

export function initClicker() {
  const root = document.querySelector("[data-clicker]");
  if (!root) return;

  const countEl = root.querySelector("[data-clicker-count]");
  const faceBtn = root.querySelector("[data-clicker-face]");
  const faceImg = faceBtn && faceBtn.querySelector("img");
  if (!countEl || !faceBtn || !faceImg) return;
  const stage = root.querySelector("[data-clicker-stage]") || faceBtn.parentElement;
  const toastEl = root.querySelector("[data-clicker-toast]");
  const resetBtn = root.querySelector("[data-clicker-reset]");
  const muteBtn = root.querySelector("[data-clicker-mute]");

  preloaded = FACE_SRCS.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  const popSound = createPopSound();
  let count = Math.max(0, parseInt(readStorage(STORAGE_KEY), 10) || 0);
  let muted = readStorage(MUTE_KEY) === "1";
  let toastTimer = 0;

  function renderCount() {
    countEl.textContent = count.toLocaleString("en-US");
  }

  function renderFace() {
    const src = FACE_SRCS[faceIndexFor(count)];
    if (faceImg.getAttribute("src") !== src) faceImg.setAttribute("src", src);
  }

  // Label stays "Sound"; aria-pressed="true" means sound is on.
  function renderMute() {
    if (!muteBtn) return;
    muteBtn.setAttribute("aria-pressed", String(!muted));
  }

  function showToast(message) {
    if (!toastEl) return;
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, TOAST_MS);
  }

  function pop() {
    faceBtn.classList.remove("is-popping");
    // Force a reflow so rapid clicks restart the animation.
    void faceBtn.offsetWidth;
    faceBtn.classList.add("is-popping");
  }

  function spawnPlusOne(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = clientX == null ? rect.width / 2 : clientX - rect.left;
    const y = clientY == null ? rect.height * 0.25 : clientY - rect.top;
    const el = document.createElement("span");
    el.className = "clicker-float";
    el.textContent = "+1";
    el.setAttribute("aria-hidden", "true");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    stage.appendChild(el);
    const remove = () => el.remove();
    el.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, 1200);
  }

  function increment(clientX, clientY) {
    count += 1;
    writeStorage(STORAGE_KEY, String(count));
    renderCount();
    renderFace();
    pop();
    spawnPlusOne(clientX, clientY);
    if (!muted) popSound.play();
    if (Object.prototype.hasOwnProperty.call(MILESTONES, count)) {
      showToast(MILESTONES[count]);
    }
  }

  // Pointer input counts on pointerdown for snappiness; the trailing click
  // (detail > 0) is ignored so a tap never counts twice. Keyboard clicks have detail 0.
  const usePointer = "PointerEvent" in window;
  if (usePointer) {
    faceBtn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();
      increment(event.clientX, event.clientY);
    });
  }

  faceBtn.addEventListener("click", (event) => {
    // Click always follows a tap and grants activation, unlike pointerdown.
    popSound.unlock();
    if (usePointer && event.detail !== 0) return;
    increment(null, null);
  });

  faceBtn.addEventListener("contextmenu", (event) => event.preventDefault());
  faceImg.addEventListener("dragstart", (event) => event.preventDefault());

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (count > 0 && !window.confirm("Reset Matthew to 0?")) return;
      count = 0;
      writeStorage(STORAGE_KEY, "0");
      renderCount();
      renderFace();
      window.clearTimeout(toastTimer);
      if (toastEl) {
        toastEl.textContent = "";
        toastEl.classList.remove("is-visible");
      }
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      muted = !muted;
      writeStorage(MUTE_KEY, muted ? "1" : "0");
      renderMute();
    });
  }

  renderCount();
  renderFace();
  renderMute();
  faceBtn.addEventListener("animationend", () => faceBtn.classList.remove("is-popping"));
}
