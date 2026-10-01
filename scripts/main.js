import { initReveal } from "./modules/reveal.js";
import { initClicker } from "./modules/clicker.js";

// The "js" class is added by an inline <head> script so reveal styles never flash.
// Each init bails on its own if its data-* hook is absent on this page.
initReveal();
initClicker();
