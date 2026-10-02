import { FACES } from "./face-data.js";

// Click counts at which the face advances to the next image (faces 1..9).
// Past the last threshold, the face cycles on every click.
const FACE_THRESHOLDS = [0, 5, 15, 30, 50, 75, 100, 150, 200];

// Milestone messages, each shown once when the count lands on the key.
const MILESTONES = {
  5: "Hey.",
  15: "Please stop clicking me.",
  30: "Stop clicking me.",
  50: "STOP CLICKING ME.",
  75: "I am getting married today.",
  100: "I said STOP.",
  150: "Do you have anything else going on?",
  200: "STOP. CLICKING. ME.",
  300: "Brittany, help.",
  500: "I will ride home on the rims to get away from you.",
  750: "This is my wedding.",
  1000: "...fine. Keep going.",
  2000: "You have a problem.",
};

const FACE_SRCS = FACES.map((face) => face.src);
const FACE_COUNT = FACE_SRCS.length;

const STORAGE_KEY = "matthew-clicks";
const MUTE_KEY = "matthew-clicks-muted";
const TOAST_MS = 2800;

// Rage (0..1) climbs per click and decays while idle; it is never persisted.
const RAGE_PER_CLICK = 0.045;
const RAGE_DECAY_PER_SEC = 0.18;
const RAGE_LEVELS = [
  [0.8, "inferno"],
  [0.5, "hot"],
  [0.25, "warm"],
];
// Rage at which the page text flips to cream; the crossover where ink and cream
// contrast equally against the red wash (see .page-clicker.is-red in styles.css).
const TEXT_FLIP_RAGE = 0.4;
// Rage from which muted/gold text darkens to ink so it stays legible on the pink wash.
const WARM_TEXT_RAGE = 0.22;

// Flame width relative to the face, as a multiple of the measured eye width.
const FLAME_WIDTH_FACTOR = 2.2;

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

function rageLevelFor(rage) {
  for (const [min, level] of RAGE_LEVELS) {
    if (rage >= min) return level;
  }
  return "calm";
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
  const flames = Array.from(faceBtn.querySelectorAll("[data-flame]"));

  preloaded = FACE_SRCS.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  const popSound = createPopSound();
  let count = Math.max(0, parseInt(readStorage(STORAGE_KEY), 10) || 0);
  let muted = readStorage(MUTE_KEY) === "1";
  let toastTimer = 0;
  let rage = 0;
  let rageFrame = 0;
  let rageLastTick = 0;

  function renderCount() {
    countEl.textContent = count.toLocaleString("en-US");
  }

  // Anchors each flame on an eye; positions are fractions of the face crop.
  // Width is also capped by the eye spacing so close-set eyes keep two flames.
  function setFlamePositions(face) {
    const eyes = (face && face.eyes) || [];
    const dx = eyes.length > 1 ? Math.abs(eyes[1].x - eyes[0].x) : Infinity;
    const width = Math.min(face ? face.eyeWidth * FLAME_WIDTH_FACTOR : 0, 0.8 * dx);
    flames.forEach((flame, i) => {
      const eye = eyes[i];
      flame.style.display = eye ? "" : "none";
      if (!eye) return;
      flame.style.left = `${(eye.x * 100).toFixed(2)}%`;
      flame.style.top = `${(eye.y * 100).toFixed(2)}%`;
      flame.style.width = `${(width * 100).toFixed(2)}%`;
      flame.style.setProperty("--flame-tilt", `${face.tilt || 0}deg`);
    });
  }

  function renderFace() {
    const face = FACES[faceIndexFor(count)];
    if (faceImg.getAttribute("src") !== face.src) {
      faceImg.setAttribute("src", face.src);
      setFlamePositions(face);
    }
  }

  // Label stays "Sound"; aria-pressed="true" means sound is on.
  function renderMute() {
    if (!muteBtn) return;
    muteBtn.setAttribute("aria-pressed", String(!muted));
  }

  function renderRage() {
    document.documentElement.style.setProperty("--rage", rage.toFixed(3));
    const level = rageLevelFor(rage);
    if (root.getAttribute("data-rage-level") !== level) {
      root.setAttribute("data-rage-level", level);
    }
    // Body classes drive text colour in CSS without relying on :has(): `is-warm`
    // darkens muted/gold text on the pink wash until `is-red` flips it to cream.
    const isRed = rage >= TEXT_FLIP_RAGE;
    document.body.classList.toggle("is-red", isRed);
    document.body.classList.toggle("is-warm", !isRed && rage >= WARM_TEXT_RAGE);
  }

  // Decay loop runs only while there is rage left to burn off.
  function tickRage(now) {
    // rAF timestamps can precede the performance.now() that armed the loop; clamp dt to [0, 0.1].
    const dt = Math.min(Math.max(0, now - rageLastTick) / 1000, 0.1);
    rageLastTick = now;
    rage = Math.max(0, rage - RAGE_DECAY_PER_SEC * dt);
    renderRage();
    rageFrame = rage > 0 ? window.requestAnimationFrame(tickRage) : 0;
  }

  function addRage(amount) {
    rage = Math.min(1, Math.max(0, rage + amount));
    renderRage();
    if (!rageFrame && rage > 0) {
      rageLastTick = performance.now();
      rageFrame = window.requestAnimationFrame(tickRage);
    }
  }

  function resetRage() {
    window.cancelAnimationFrame(rageFrame);
    rageFrame = 0;
    rage = 0;
    renderRage();
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
    addRage(RAGE_PER_CLICK);
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
      resetRage();
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
  setFlamePositions(FACES[faceIndexFor(count)]);
  renderRage();
  renderMute();
  // Flame flicker also fires animationend; only the button's own pop should clear.
  faceBtn.addEventListener("animationend", (event) => {
    if (event.target === faceBtn) faceBtn.classList.remove("is-popping");
  });
}
