import { LightningStorm } from "./lightning.js";
import { initParallax, initPointerAtmosphere, initRealmTracking, initRevealMotion } from "./motion.js";
import { initStormbreaker } from "./stormbreaker.js";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const storm = new LightningStorm(document.querySelector("#storm-canvas"));
const intro = document.querySelector("#intro");
const skipButton = document.querySelector("#skip-intro");
const soundToggle = document.querySelector(".sound-toggle");

let introFinished = false;
let audioContext;
let ambienceGain;

function finishIntro() {
  if (introFinished) return;
  introFinished = true;
  intro?.classList.add("is-finished");
  document.body.classList.remove("is-loading");
  sessionStorage.setItem("asgard-intro-seen", "true");
  window.setTimeout(() => intro?.remove(), 1000);
}

function scheduleIntro() {
  if (reducedMotion || sessionStorage.getItem("asgard-intro-seen") === "true") {
    finishIntro();
    return;
  }

  window.setTimeout(() => storm.strike({ x: innerWidth * 0.32, intensity: 0.7 }), 540);
  window.setTimeout(() => storm.cinematicStrike(), 1160);
  window.setTimeout(() => storm.strike({ x: innerWidth * 0.71, intensity: 0.8 }), 2450);
  window.setTimeout(finishIntro, 4650);
}

function createAtmosphere() {
  audioContext ||= new AudioContext();
  if (ambienceGain) return;

  const length = audioContext.sampleRate * 3;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 135;
  filter.Q.value = 0.55;

  ambienceGain = audioContext.createGain();
  ambienceGain.gain.value = 0;
  noise.connect(filter).connect(ambienceGain).connect(audioContext.destination);
  noise.start();
}

async function toggleSound() {
  createAtmosphere();
  await audioContext.resume();
  const enabled = soundToggle.getAttribute("aria-pressed") !== "true";
  soundToggle.setAttribute("aria-pressed", String(enabled));
  ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
  ambienceGain.gain.linearRampToValueAtTime(enabled ? 0.055 : 0, audioContext.currentTime + 0.8);
}

skipButton?.addEventListener("click", finishIntro);
soundToggle?.addEventListener("click", toggleSound);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") finishIntro();
});

initRevealMotion();
initParallax();
initPointerAtmosphere();
initStormbreaker(document.querySelector("#stormbreaker"));
initRealmTracking((realm, section) => {
  if (realm <= 1 || reducedMotion) return;
  const rect = section.getBoundingClientRect();
  const x = realm % 2 === 0 ? innerWidth * 0.2 : innerWidth * 0.8;
  storm.strike({ x, intensity: realm === 6 ? 1.2 : 0.45 });
  section.animate(
    [
      { filter: "brightness(1)", offset: 0 },
      { filter: "brightness(1.16)", offset: 0.08 },
      { filter: "brightness(1)", offset: 1 },
    ],
    { duration: 700, easing: "ease-out" },
  );
});

window.addEventListener("load", scheduleIntro, { once: true });
