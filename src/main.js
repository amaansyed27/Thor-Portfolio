import './styles.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThorWorld } from './world.js';
import { StormAudio } from './storm-audio.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = document.querySelector('#loader');
const loaderBar = document.querySelector('#loader-bar');
const loaderStatus = document.querySelector('#loader-status');
const loaderDetail = document.querySelector('#loader-detail');
const intro = document.querySelector('#intro');
const flash = document.querySelector('.flash');
const soundButton = document.querySelector('#sound-toggle');
const replayButton = document.querySelector('#replay-intro');
const audio = new StormAudio();

const world = new ThorWorld(document.querySelector('#world'), {
  onProgress(value) {
    loaderBar.style.width = `${Math.round(value * 100)}%`;
    loaderDetail.textContent = `${Math.round(value * 100)}% · verifying supplied model`;
  },
  onStatus(message) {
    loaderStatus.textContent = message.toUpperCase();
  },
});
globalThis.__THOR_WORLD__ = world;

function splitText(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!node.nodeValue.trim()) continue;
    const fragment = document.createDocumentFragment();
    for (const character of node.nodeValue) {
      if (/\s/.test(character)) fragment.append(character);
      else {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = character;
        fragment.append(span);
      }
    }
    node.replaceWith(fragment);
  }
}

document.querySelectorAll('.split').forEach(splitText);

const lenis = new Lenis({ duration: 1.18, smoothWheel: true, wheelMultiplier: 0.86, touchMultiplier: 1.15 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

function flashStrike(intensity = 1) {
  gsap.killTweensOf(flash);
  gsap.set(flash, { opacity: 0 });
  gsap.timeline()
    .to(flash, { opacity: 0.82 * intensity, duration: 0.035 })
    .to(flash, { opacity: 0.06, duration: 0.09 })
    .to(flash, { opacity: 0.42 * intensity, duration: 0.025 })
    .to(flash, { opacity: 0, duration: 0.55, ease: 'power3.out' });
  audio.thunder(intensity);
}

function triggerStrike(options = {}) {
  world.strike(options);
  flashStrike(options.intensity || 1);
}

function hideLoader() {
  loader.classList.add('is-hidden');
  window.setTimeout(() => loader.remove(), 800);
}

let motionInitialized = false;

function finishIntro() {
  document.body.classList.remove('is-locked', 'is-cinematic');
  intro.classList.add('is-gone');
  gsap.to(intro, { opacity: 0, duration: 0.75, ease: 'power2.inOut', onComplete: () => intro.style.display = 'none' });
  gsap.to('.site-header', { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' });
  gsap.to('.realm-meter', { opacity: 1, duration: 0.6 });
  if (!motionInitialized) {
    motionInitialized = true;
    setupRevealMotion();
  }
  ScrollTrigger.refresh();
}

function playIntro() {
  intro.style.display = 'grid';
  gsap.set(intro, { opacity: 1 });
  intro.classList.remove('is-gone');
  document.body.classList.add('is-locked', 'is-cinematic');
  lenis.scrollTo(0, { immediate: true });

  const paths = intro.querySelectorAll('.sigil__loops path');
  const halos = intro.querySelectorAll('.sigil__halo circle');
  paths.forEach((path) => {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 0.22 });
  });
  gsap.set(halos, { opacity: 0, scale: 0.75, transformOrigin: '50% 50%' });
  gsap.set('.intro__copy', { opacity: 0, y: 14 });
  gsap.set(world.modelPivot.position, { x: 0, y: 0.05, z: -8 });
  gsap.set(world.modelPivot.rotation, { x: 2.8, y: -2.2, z: 2.1 });
  gsap.set(world.modelPivot.scale, { x: 0.08, y: 0.08, z: 0.08 });

  if (reducedMotion) {
    gsap.set(world.modelPivot.position, { x: 2.5, y: -0.25, z: 0 });
    gsap.set(world.modelPivot.rotation, { x: -0.12, y: -0.35, z: -0.74 });
    gsap.set(world.modelPivot.scale, { x: 1, y: 1, z: 1 });
    finishIntro();
    return;
  }

  gsap.timeline()
    .to('.intro__sigil-wrap', { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' })
    .to(paths, { strokeDashoffset: 0, opacity: 1, duration: 1.15, stagger: 0.08, ease: 'power2.inOut' }, 0.15)
    .to(halos, { opacity: 1, scale: 1, duration: 1.2, stagger: 0.08, ease: 'power2.out' }, 0.2)
    .to('.intro__copy', { opacity: 1, y: 0, duration: 0.55 }, 0.45)
    .call(() => triggerStrike({ x: 0, y: 0, z: 0, intensity: 1.15 }), null, 1.05)
    .to('.intro__core', { opacity: 1, scale: 1.4, duration: 0.18 }, 1.02)
    .to('.intro__core', { opacity: 0.25, scale: 5, duration: 0.7, ease: 'power3.out' }, 1.2)
    .to(world.modelPivot.position, { x: 0, y: 0, z: 0.2, duration: 1.25, ease: 'power4.out' }, 1.25)
    .to(world.modelPivot.rotation, { x: -0.08, y: -0.35, z: -0.78, duration: 1.25, ease: 'power4.out' }, 1.25)
    .to(world.modelPivot.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 1.2, ease: 'back.out(1.5)' }, 1.25)
    .call(() => triggerStrike({ x: 0.15, y: -0.35, z: 0, intensity: 0.75 }), null, 2.55)
    .to(world.modelPivot.position, { x: 2.5, y: -0.25, z: 0, duration: 1.15, ease: 'power3.inOut' }, 3.05)
    .to(world.modelPivot.scale, { x: 1, y: 1, z: 1, duration: 1.15, ease: 'power3.inOut' }, 3.05)
    .to('.intro__sigil-wrap', { opacity: 0, scale: 1.45, duration: 0.8, ease: 'power2.in' }, 3.15)
    .to('.intro__copy, .intro__skip', { opacity: 0, duration: 0.35 }, 3.45)
    .call(finishIntro, null, 4.05);
}

function setupRevealMotion() {
  gsap.utils.toArray('.reveal').forEach((element) => {
    gsap.to(element, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.split').forEach((element) => {
    gsap.from(element.querySelectorAll('.char'), { opacity: 0, yPercent: 90, rotateX: -70, transformOrigin: '50% 100%', stagger: 0.018, duration: 0.75, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 86%', once: true } });
  });
}

function setModelPose({ x, y, z, rx, ry, rz, scale }, immediate = false) {
  if (immediate) {
    world.modelPivot.position.set(x, y, z);
    world.modelPivot.rotation.set(rx, ry, rz);
    world.modelPivot.scale.setScalar(scale);
    return;
  }
  gsap.to(world.modelPivot.position, { x, y, z, duration: 0.45, overwrite: 'auto', ease: 'power2.out' });
  gsap.to(world.modelPivot.rotation, { x: rx, y: ry, z: rz, duration: 0.45, overwrite: 'auto', ease: 'power2.out' });
  gsap.to(world.modelPivot.scale, { x: scale, y: scale, z: scale, duration: 0.45, overwrite: 'auto', ease: 'power2.out' });
}

function setupWorldScroll() {
  gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1.1 } })
    .to('.hero__copy', { y: -90, opacity: 0.05, scale: 0.94, ease: 'none' }, 0)
    .to(world.modelPivot.position, { x: 0.7, y: -0.75, z: -0.6, ease: 'none' }, 0)
    .to(world.modelPivot.rotation, { x: 0.22, y: 0.6, z: 0.3, ease: 'none' }, 0)
    .to(world.modelPivot.scale, { x: 0.78, y: 0.78, z: 0.78, ease: 'none' }, 0)
    .to(world.camera.position, { z: 6.8, ease: 'none' }, 0);

  ScrollTrigger.create({
    trigger: '#origin', start: 'top 70%', end: 'bottom 30%', scrub: true,
    onUpdate(self) {
      const p = self.progress;
      setModelPose({ x: -2.4 + p * 0.35, y: 0.25 - p * 0.5, z: -1.2, rx: -0.18, ry: -0.9 + p * 0.6, rz: 0.72, scale: 0.78 }, true);
      world.bifrost.rotation.z = p * 0.45;
    },
  });

  const track = document.querySelector('.sagas__track');
  const sagaRail = document.querySelector('#saga-progress');
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: '.sagas__pin', start: 'top top', end: () => `+=${innerWidth * 3.15}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate(self) {
        const p = self.progress;
        sagaRail.style.width = `${p * 100}%`;
        const phase = p * 3;
        if (phase < 1) setModelPose({ x: -2.8 + phase * 5.3, y: 1.1 - phase * 1.4, z: -1.5, rx: 0.25, ry: phase * 1.4, rz: -0.9 + phase * 1.4, scale: 0.62 }, true);
        else if (phase < 2) setModelPose({ x: 2.5 - (phase - 1) * 5, y: -0.3 + (phase - 1) * 0.8, z: -1.1, rx: -0.2, ry: 1.4 + (phase - 1) * 1.5, rz: 0.5 - (phase - 1) * 1.2, scale: 0.68 }, true);
        else setModelPose({ x: -2.5 + (phase - 2) * 4.7, y: 0.5 - (phase - 2) * 0.7, z: -0.9, rx: 0.14, ry: 2.9 + (phase - 2) * 1.4, rz: -0.7 + (phase - 2) * 1.1, scale: 0.7 }, true);
      },
      onEnter: () => triggerStrike({ x: -2.6, y: -1, intensity: 0.42 }),
      onEnterBack: () => triggerStrike({ x: 2.5, y: -1, intensity: 0.42 }),
    },
  });

  const orbit = document.querySelector('.arsenal__orbit');
  ScrollTrigger.create({
    trigger: '#arsenal', start: 'top top', end: 'bottom bottom', scrub: 1,
    onUpdate(self) {
      const p = self.progress;
      orbit.style.transform = `rotate(${p * 155}deg) rotateX(${Math.sin(p * Math.PI) * 9}deg)`;
      orbit.querySelectorAll(':scope > span').forEach((span) => span.style.rotate = `${-p * 155}deg`);
      setModelPose({ x: 0, y: -0.1, z: 1.2, rx: -0.08, ry: p * Math.PI * 2.2, rz: -0.05, scale: 1.16 }, true);
      world.bloom.strength = 0.68 + Math.sin(p * Math.PI) * 0.35;
    },
  });

  ScrollTrigger.create({
    trigger: '#chronicle', start: 'top 70%', end: 'bottom 20%', scrub: true,
    onUpdate(self) {
      const p = self.progress;
      setModelPose({ x: 2.65, y: 1.15 - p * 1.7, z: -1.8, rx: 0.4, ry: 1.1 + p, rz: 0.75, scale: 0.58 }, true);
      world.bifrost.position.z = -7 + p * 3;
    },
  });

  let contactStruck = false;
  ScrollTrigger.create({
    trigger: '#contact', start: 'top 70%', end: 'bottom bottom', scrub: 1,
    onUpdate(self) {
      const p = self.progress;
      setModelPose({ x: 2.7 - p * 2.7, y: 1.7 - p * 2.6, z: -0.4 + p * 0.7, rx: -0.2, ry: 1.8 + p * 1.1, rz: -0.7 + p * 0.78, scale: 0.7 + p * 0.5 }, true);
      world.bifrostMaterials.forEach((material, index) => material.opacity = 0.05 + p * (0.12 - index * 0.002));
      if (p > 0.68 && !contactStruck) {
        contactStruck = true;
        triggerStrike({ x: 0, y: -1.1, intensity: 1.2 });
      }
      if (p < 0.45) contactStruck = false;
    },
  });
}

function setupRealmMeter() {
  const number = document.querySelector('#realm-number');
  const name = document.querySelector('#realm-name');
  const progress = document.querySelector('#realm-progress');
  document.querySelectorAll('.realm').forEach((section) => {
    ScrollTrigger.create({
      trigger: section, start: 'top center', end: 'bottom center',
      onToggle(self) {
        if (!self.isActive) return;
        number.textContent = section.dataset.realm;
        name.textContent = section.dataset.name;
      },
      onUpdate(self) {
        if (self.isActive) progress.style.height = `${self.progress * 100}%`;
      },
    });
  });
}

function setupWaveform() {
  const canvas = document.querySelector('.voice-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * Math.min(devicePixelRatio, 1.5)));
    canvas.height = Math.max(1, Math.floor(rect.height * Math.min(devicePixelRatio, 1.5)));
  };
  resize();
  addEventListener('resize', resize, { passive: true });
  const draw = (time) => {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1.2 * Math.min(devicePixelRatio, 1.5);
    for (let line = 0; line < 5; line += 1) {
      context.beginPath();
      context.strokeStyle = line % 2 ? 'rgba(216,179,63,.48)' : 'rgba(112,200,255,.48)';
      for (let x = 0; x <= width; x += 3) {
        const nx = x / width;
        const envelope = Math.sin(nx * Math.PI);
        const y = height * 0.5 + Math.sin(nx * 28 + time * 0.0016 + line) * height * (0.025 + line * 0.009) * envelope + Math.sin(nx * 73 - time * 0.001) * height * 0.012 * envelope;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

soundButton.addEventListener('click', async () => {
  const enabled = await audio.toggle();
  soundButton.textContent = enabled ? 'Sound on' : 'Sound off';
  soundButton.setAttribute('aria-pressed', String(enabled));
  if (enabled) triggerStrike({ x: 2.2, y: -1, intensity: 0.55 });
});

document.querySelector('#skip-intro').addEventListener('click', finishIntro);
replayButton.addEventListener('click', playIntro);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.body.classList.contains('is-cinematic')) finishIntro(); });

try {
  await world.ready;
  document.documentElement.dataset.stormbreaker = 'loaded';
  hideLoader();
  setupWorldScroll();
  setupRealmMeter();
  setupWaveform();
  playIntro();
} catch (error) {
  console.error('Stormbreaker failed to load', error);
  document.documentElement.dataset.stormbreaker = 'failed';
  loaderStatus.textContent = 'STORMBREAKER COULD NOT BE FORGED';
  loaderDetail.textContent = error instanceof Error ? error.message : String(error);
  loaderBar.style.width = '100%';
  loaderBar.style.background = '#b44949';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry model load';
  retry.className = 'intro__skip';
  retry.style.position = 'static';
  retry.addEventListener('click', () => location.reload());
  loader.append(retry);
}
