import './styles.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThorScene } from './webgl/ThorScene.js';
import { ThunderAudio } from './audio/ThunderAudio.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const intro = document.querySelector('#intro');
const introStatus = document.querySelector('#intro-status');
const flash = document.querySelector('.lightning-flash');
const realmNumber = document.querySelector('.realm-rail__number');
const realmName = document.querySelector('.realm-rail__name');
const soundButtons = [...document.querySelectorAll('.sound-toggle')];
const replayButtons = [...document.querySelectorAll('.replay-toggle')];
const thunder = new ThunderAudio();

const lenis = new Lenis({
  lerp: 0.075,
  smoothWheel: true,
  wheelMultiplier: 0.9,
  syncTouch: false,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const scene = new ThorScene(document.querySelector('#experience'), {
  onProgress(progress) {
    if (introStatus) introStatus.textContent = progress >= 1 ? 'Stormbreaker is ready.' : `Forging Stormbreaker… ${Math.round(progress * 100)}%`;
  },
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function splitTitles() {
  document.querySelectorAll('.split-title').forEach((title) => {
    const accessibleText = title.textContent.replace(/\s+/g, ' ').trim();
    title.setAttribute('aria-label', accessibleText);
    title.querySelectorAll(':scope > span').forEach((line) => {
      const text = line.textContent;
      line.textContent = '';
      [...text].forEach((character) => {
        const wrap = document.createElement('span');
        wrap.className = 'char-wrap';
        wrap.setAttribute('aria-hidden', 'true');
        const glyph = document.createElement('span');
        glyph.className = 'char';
        glyph.innerHTML = character === ' ' ? '&nbsp;' : character;
        wrap.append(glyph);
        line.append(wrap);
      });
    });
  });
}

function visualFlash(intensity = 1) {
  gsap.killTweensOf(flash);
  gsap.timeline()
    .set(flash, { autoAlpha: 0 })
    .to(flash, { autoAlpha: 0.7 * intensity, duration: 0.025 })
    .to(flash, { autoAlpha: 0.06, duration: 0.07 })
    .to(flash, { autoAlpha: 0.42 * intensity, duration: 0.025 })
    .to(flash, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' });
}

function strike(x = 0, intensity = 1) {
  scene.strike(x, intensity);
  visualFlash(Math.min(intensity, 1.3));
  thunder.strike(intensity);
}

let introTimeline;
function finishIntro() {
  scene.setIntroProgress(1);
  document.body.classList.remove('is-intro-locked');
  lenis.start();
  gsap.set(intro, { autoAlpha: 0, pointerEvents: 'none' });
  gsap.to(['.site-header', '.realm-rail'], { autoAlpha: 1, duration: 0.9, ease: 'power2.out' });
}

async function playIntro() {
  introTimeline?.kill();
  lenis.stop();
  scrollTo(0, 0);
  document.body.classList.add('is-intro-locked');
  scene.setIntroProgress(0);
  gsap.set(intro, { autoAlpha: 1, pointerEvents: 'auto', clipPath: 'none' });
  gsap.set('.intro__sigil', { autoAlpha: 0, scale: 0.35, rotation: -18, filter: 'blur(18px) drop-shadow(0 0 4rem rgba(90,177,235,.1))' });
  gsap.set('.intro__runes span', { scale: 0.45, autoAlpha: 0, rotation: -90 });
  gsap.set('.intro__copy .eyebrow, .intro__status', { autoAlpha: 0, y: 18 });
  gsap.set('.intro h1 .char', { yPercent: 120 });
  gsap.set(['.site-header', '.realm-rail'], { autoAlpha: 0 });

  await Promise.race([scene.ready, new Promise((resolve) => setTimeout(resolve, 2800))]);
  if (reducedMotion) {
    finishIntro();
    return;
  }

  const driver = { value: 0 };
  introTimeline = gsap.timeline({ onComplete: finishIntro });
  introTimeline
    .to(driver, { value: 1, duration: 4.7, ease: 'none', onUpdate: () => scene.setIntroProgress(driver.value) }, 0)
    .to('.intro__runes span', { autoAlpha: 1, scale: 1, rotation: (index) => index * 42, duration: 1.6, stagger: 0.09, ease: 'power3.out' }, 0.2)
    .to('.intro__sigil', { autoAlpha: 1, scale: 1, rotation: 0, filter: 'blur(0px) drop-shadow(0 0 2rem rgba(240,215,106,.34))', duration: 1.25, ease: 'expo.out' }, 0.38)
    .to('.intro__copy .eyebrow', { autoAlpha: 1, y: 0, duration: 0.7 }, 0.64)
    .call(() => strike(-0.42, 0.85), [], 0.78)
    .to('.intro h1 .char', { yPercent: 0, duration: 1.15, stagger: 0.018, ease: 'expo.out' }, 0.9)
    .to('.intro__status', { autoAlpha: 1, y: 0, duration: 0.6 }, 1.38)
    .call(() => strike(0.5, 1.22), [], 2.1)
    .to('.intro__sigil', { scale: 1.36, autoAlpha: 0.18, duration: 0.55, ease: 'power4.in' }, 2.25)
    .to('.intro__runes span', { scale: 2.3, autoAlpha: 0, duration: 1.05, stagger: 0.04, ease: 'expo.in' }, 2.32)
    .call(() => strike(0.05, 1.45), [], 2.72)
    .to('.intro__copy', { y: '-9vh', autoAlpha: 0, duration: 0.8, ease: 'power3.in' }, 3.15)
    .to(intro, { clipPath: 'circle(0% at 50% 50%)', duration: 1.05, ease: 'expo.inOut' }, 3.62)
    .set(intro, { clipPath: 'none' });
}

function setupSound() {
  soundButtons.forEach((button) => button.addEventListener('click', async () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    await thunder.setEnabled(enabled);
    soundButtons.forEach((item) => {
      item.setAttribute('aria-pressed', String(enabled));
      item.textContent = enabled ? 'Sound on' : 'Sound off';
    });
    if (enabled) thunder.strike(0.45);
  }));
}

function setupNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { duration: 1.6, offset: 0 });
    });
  });
  replayButtons.forEach((button) => button.addEventListener('click', playIntro));
  document.querySelector('#skip-intro')?.addEventListener('click', () => {
    introTimeline?.kill();
    finishIntro();
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('is-intro-locked')) {
      introTimeline?.kill();
      finishIntro();
    }
  });
}

function setupReveals() {
  gsap.utils.toArray('.reveal-line').forEach((element) => {
    gsap.fromTo(element, { y: 52, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: 1.15,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 86%', toggleActions: 'play none none reverse' },
    });
  });

  document.querySelectorAll('.section-heading').forEach((heading) => {
    gsap.fromTo(heading.querySelectorAll('.char'), { yPercent: 120 }, {
      yPercent: 0,
      duration: 1.05,
      stagger: 0.015,
      ease: 'expo.out',
      scrollTrigger: { trigger: heading, start: 'top 78%' },
    });
  });
}

function setupHero() {
  gsap.set('.hero__title .char', { yPercent: 115 });
  gsap.to('.hero__title .char', { yPercent: 0, duration: 1.2, stagger: 0.014, ease: 'expo.out', delay: 4.2 });

  const timeline = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 1.1 },
  });
  timeline
    .to('.hero__title span:first-child', { xPercent: -15, autoAlpha: 0.18, ease: 'none' }, 0)
    .to('.hero__title span:last-child', { xPercent: 18, autoAlpha: 0.05, ease: 'none' }, 0)
    .to('.hero__statement', { y: -100, autoAlpha: 0, ease: 'none' }, 0.12)
    .to('.hero__weapon-label', { x: 80, autoAlpha: 0, ease: 'none' }, 0.15)
    .to('.hero__scroll', { autoAlpha: 0, ease: 'none' }, 0.05);

  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom bottom',
    onUpdate: ({ progress }) => scene.setScene(progress * 0.95),
  });
}

function setupOrigin() {
  ScrollTrigger.create({
    trigger: '.origin', start: 'top bottom', end: 'bottom top',
    onUpdate: ({ progress }) => scene.setScene(0.75 + progress * 1.25),
  });
  gsap.to('.origin .section-heading', {
    xPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.origin', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

function setupSagas() {
  const section = document.querySelector('.sagas');
  const track = document.querySelector('.sagas__track');
  const progressBar = document.querySelector('.sagas__progress i');
  gsap.set('.saga__copy', { y: 70, autoAlpha: 0.25 });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.75,
    onUpdate(self) {
      const progress = self.progress;
      gsap.set(track, { xPercent: -66.6667 * progress });
      gsap.set(progressBar, { scaleX: progress });
      scene.setScene(2 + progress * 2);
      document.querySelectorAll('.saga').forEach((saga, index) => {
        const center = index / 2;
        const proximity = clamp(1 - Math.abs(progress - center) * 2.4);
        gsap.set(saga.querySelector('.saga__copy'), { y: (1 - proximity) * 70, autoAlpha: 0.18 + proximity * 0.82 });
        gsap.set(saga.querySelector('.saga__glyph'), { rotation: (progress - center) * 110, scale: 0.75 + proximity * 0.3 });
      });
    },
  });
}

function setupArsenal() {
  const skills = [...document.querySelectorAll('.arsenal__skills span')];
  gsap.set(skills, { x: 0, y: 0, scale: 0.2, autoAlpha: 0 });

  ScrollTrigger.create({
    trigger: '.arsenal',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.8,
    onUpdate({ progress }) {
      const eased = gsap.parseEase('power3.out')(clamp(progress * 1.4));
      skills.forEach((skill, index) => {
        const x = (Number(skill.dataset.x) / 100) * innerWidth * eased;
        const y = (Number(skill.dataset.y) / 100) * innerHeight * eased;
        gsap.set(skill, { x, y, scale: 0.2 + eased * 0.8, autoAlpha: clamp(eased * 1.5 - index * 0.025) });
      });
      gsap.set('.arsenal__orbits', { rotation: progress * 165, scale: 0.65 + progress * 0.6 });
      gsap.set('.arsenal__core', { rotation: -progress * 35, scale: 0.75 + progress * 0.25 });
      scene.setScene(5 + progress * 0.85);
    },
  });
}

function setupChronicle() {
  gsap.to('.chronicle__line i', {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.chronicle', start: 'top 65%', end: 'bottom 70%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '.chronicle', start: 'top bottom', end: 'bottom top',
    onUpdate: ({ progress }) => scene.setScene(5.8 + progress * 1.2),
  });
}

function setupContact() {
  gsap.fromTo('.contact__sigil', { scale: 0.3, rotation: -40, autoAlpha: 0 }, {
    scale: 1,
    rotation: 0,
    autoAlpha: 0.22,
    ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: 1 },
  });
  gsap.fromTo('.contact__beam', { scaleX: 0.05, autoAlpha: 0 }, {
    scaleX: 1,
    autoAlpha: 0.75,
    ease: 'power2.in',
    scrollTrigger: { trigger: '.contact', start: 'top 80%', end: 'center center', scrub: 1 },
  });
  ScrollTrigger.create({
    trigger: '.contact', start: 'top bottom', end: 'bottom bottom',
    onEnter: () => strike(0, 1.15),
    onUpdate: ({ progress }) => scene.setScene(6.7 + progress * 0.3),
  });
}

function setupRealmTracking() {
  document.querySelectorAll('.scene-section').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => updateRealm(section),
      onEnterBack: () => updateRealm(section),
    });
  });
}

function updateRealm(section) {
  realmNumber.textContent = section.dataset.realm;
  realmName.textContent = section.dataset.name;
  gsap.fromTo([realmNumber, realmName], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 });
  if (!document.body.classList.contains('is-intro-locked') && section.id !== 'home') {
    const x = Number(section.dataset.scene) % 2 ? -0.55 : 0.58;
    strike(x, section.id === 'contact' ? 1.15 : 0.38);
  }
}

function init() {
  splitTitles();
  setupSound();
  setupNavigation();
  setupReveals();
  setupHero();
  setupOrigin();
  setupSagas();
  setupArsenal();
  setupChronicle();
  setupContact();
  setupRealmTracking();
  ScrollTrigger.refresh();
  playIntro();
}

init();
