// Ten clicks on [data-secret-trigger] reveal [data-secret-target]; the reveal persists.
const SECRET_CLICKS = 10;
const STORAGE_KEY = "tupac-revealed";

export function initSecret() {
  const trigger = document.querySelector("[data-secret-trigger]");
  const target = document.querySelector("[data-secret-target]");
  if (!trigger || !target) return;

  const status = trigger.querySelector("[data-secret-status]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let clicks = 0;
  let revealed = false;
  let pokeTimer = 0;

  const announce = (text) => {
    if (status) status.textContent = text;
  };

  // Once revealed the trigger is inert: no role, not focusable.
  const retire = () => {
    revealed = true;
    trigger.setAttribute("aria-disabled", "true");
    trigger.removeAttribute("role");
    trigger.removeAttribute("tabindex");
  };

  const reveal = () => {
    target.hidden = false;
    target.classList.add("is-revealed");
    retire();
    announce("Secret photo revealed.");
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  };

  const poke = () => {
    trigger.classList.remove("is-poked");
    void trigger.offsetWidth;
    trigger.classList.add("is-poked");
    clearTimeout(pokeTimer);
    pokeTimer = setTimeout(() => trigger.classList.remove("is-poked"), 150);
  };

  // No progress hint of any kind: only the squash, then the reveal.
  const tap = () => {
    if (revealed) return;
    clicks += 1;
    poke();
    if (clicks >= SECRET_CLICKS) reveal();
  };

  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (stored === "1") {
    target.hidden = false;
    retire();
    return;
  }

  trigger.addEventListener("click", tap);
  // A figure with role=button never synthesizes click from keys, so no double count.
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    tap();
  });
}
