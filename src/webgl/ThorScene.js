import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const STATES = [
  { camera: [0, 0.2, 7.4], look: [0, 0, 0], weapon: [1.65, -0.15, 0], rotation: [-0.05, -0.55, -0.63], scale: 1.1, sigil: [-2.4, 0, -2.8], sigilScale: 1.15, sigilOpacity: 0.14, ringsOpacity: 0.05 },
  { camera: [0.6, 0.1, 7.1], look: [-0.25, 0, 0], weapon: [-2.25, -0.35, -0.8], rotation: [0.15, 0.38, 0.42], scale: 0.85, sigil: [2.45, 0.15, -3], sigilScale: 1.35, sigilOpacity: 0.1, ringsOpacity: 0.08 },
  { camera: [-0.35, 0.08, 6.6], look: [0.35, 0, -0.2], weapon: [2.25, -0.15, -0.6], rotation: [-0.15, -0.8, -0.85], scale: 0.92, sigil: [-2.6, 0, -3.4], sigilScale: 1.1, sigilOpacity: 0.05, ringsOpacity: 0.24 },
  { camera: [0.3, 0.15, 6.2], look: [-0.35, 0.1, -0.5], weapon: [-2.05, 0.1, -0.5], rotation: [0.15, 0.75, 0.55], scale: 0.96, sigil: [2.65, 0.1, -3.5], sigilScale: 1.25, sigilOpacity: 0.08, ringsOpacity: 0.36 },
  { camera: [-0.2, 0, 6.3], look: [0.25, 0, -0.3], weapon: [2.15, 0.05, -0.65], rotation: [-0.08, -1.05, -0.28], scale: 0.9, sigil: [-2.5, -0.1, -3.2], sigilScale: 1.3, sigilOpacity: 0.07, ringsOpacity: 0.24 },
  { camera: [0, 0.05, 7], look: [0, 0, -0.3], weapon: [0, -0.05, -0.55], rotation: [0.04, 0.15, -0.16], scale: 0.72, sigil: [0, 0, -3.8], sigilScale: 1.9, sigilOpacity: 0.12, ringsOpacity: 0.3 },
  { camera: [0.45, 0.15, 7.2], look: [-0.3, 0, -0.5], weapon: [-2.35, -0.6, -1.15], rotation: [0.1, 0.42, 0.2], scale: 0.76, sigil: [2.45, 0.35, -3.8], sigilScale: 1.45, sigilOpacity: 0.09, ringsOpacity: 0.12 },
  { camera: [0, 0.05, 7.8], look: [0, 0, -1], weapon: [0, -0.25, -2.15], rotation: [-0.04, -0.25, -0.38], scale: 0.6, sigil: [0, 0.15, -3.2], sigilScale: 2.55, sigilOpacity: 0.32, ringsOpacity: 0.62 },
];

const lerpArray = (a, b, t) => a.map((value, index) => THREE.MathUtils.lerp(value, b[index], t));
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export class ThorScene {
  constructor(canvas, { onProgress } = {}) {
    this.canvas = canvas;
    this.onProgress = onProgress;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.targetPointer = new THREE.Vector2();
    this.lightningBursts = [];
    this.introActive = true;
    this.introProgress = 0;
    this.sceneFloat = 0;
    this.ringVelocity = 0.28;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02050a);
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.052);

    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 100);
    this.camera.position.set(0, 0.2, 7.4);
    this.lookAt = new THREE.Vector3();
    this.targetCamera = this.camera.position.clone();
    this.targetLookAt = new THREE.Vector3();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();
    pmrem.dispose();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.72, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.createLights();
    this.createAtmosphere();
    this.createBifrost();
    this.createWeaponRoot();
    this.createSigilRoot();
    this.loadAssets();
    this.bindEvents();
    this.applySceneState(0, true);
    this.render();
  }

  createLights() {
    this.scene.add(new THREE.HemisphereLight(0x7399b8, 0x07090c, 1.15));
    this.keyLight = new THREE.PointLight(0xb8e7ff, 34, 18, 1.8);
    this.keyLight.position.set(3.5, 4.2, 4.8);
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.PointLight(0xf0d76a, 24, 15, 1.9);
    this.rimLight.position.set(-4.5, 1.5, 2);
    this.scene.add(this.rimLight);
    this.flashLight = new THREE.PointLight(0xe8f8ff, 0, 30, 1.3);
    this.flashLight.position.set(0, 5, 3);
    this.scene.add(this.flashLight);
  }

  createAtmosphere() {
    const starPositions = new Float32Array(900 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = THREE.MathUtils.randFloatSpread(22);
      starPositions[i + 1] = THREE.MathUtils.randFloatSpread(14);
      starPositions[i + 2] = THREE.MathUtils.randFloat(-14, 1);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x9ed8ff, size: 0.018, transparent: true, opacity: 0.58, depthWrite: false }));
    this.scene.add(this.stars);

    const rainPositions = new Float32Array(520 * 3);
    for (let i = 0; i < rainPositions.length; i += 3) {
      rainPositions[i] = THREE.MathUtils.randFloatSpread(16);
      rainPositions[i + 1] = THREE.MathUtils.randFloat(-6, 8);
      rainPositions[i + 2] = THREE.MathUtils.randFloat(-9, 3);
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0xaedfff, size: 0.025, transparent: true, opacity: 0.2, depthWrite: false }));
    this.scene.add(this.rain);
  }

  createBifrost() {
    this.rings = new THREE.Group();
    this.ringMaterials = [];
    for (let i = 0; i < 24; i += 1) {
      const material = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xf0d76a : 0x76c9ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45 + (i % 3) * 0.05, 0.008, 5, 128), material);
      ring.position.z = -i * 0.62 - 1.6;
      ring.rotation.z = i * 0.23;
      ring.userData.baseScale = 1 + i * 0.015;
      this.ringMaterials.push(material);
      this.rings.add(ring);
    }
    this.scene.add(this.rings);
  }

  createWeaponRoot() {
    this.weaponRoot = new THREE.Group();
    this.weaponRoot.scale.setScalar(0.001);
    this.targetWeapon = { position: new THREE.Vector3(), rotation: new THREE.Euler(), scale: 1 };
    this.world.add(this.weaponRoot);
  }

  createSigilRoot() {
    this.sigilRoot = new THREE.Group();
    this.sigilRoot.position.z = -3;
    this.targetSigil = { position: new THREE.Vector3(), scale: 1, opacity: 0 };
    this.world.add(this.sigilRoot);
  }

  loadAssets() {
    const manager = new THREE.LoadingManager();
    this.ready = new Promise((resolve) => {
      manager.onLoad = () => {
        this.assetsReady = true;
        this.onProgress?.(1);
        resolve();
      };
    });
    manager.onProgress = (_url, loaded, total) => this.onProgress?.(loaded / Math.max(total, 1));

    new THREE.TextureLoader(manager).load('/assets/asgard-mark.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      const geometry = new THREE.PlaneGeometry(4.1, 3.88);
      const material = new THREE.MeshBasicMaterial({ map: texture, color: 0xf0d76a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      this.sigilMaterial = material;
      this.sigil = new THREE.Mesh(geometry, material);
      this.sigilRoot.add(this.sigil);
      this.sigilGlowMaterial = material.clone();
      this.sigilGlowMaterial.opacity = 0;
      this.sigilGlowMaterial.color.set(0x83d7ff);
      this.sigilGlow = new THREE.Mesh(geometry, this.sigilGlowMaterial);
      this.sigilGlow.scale.setScalar(1.045);
      this.sigilGlow.position.z = -0.03;
      this.sigilRoot.add(this.sigilGlow);
    }, undefined, () => this.createFallbackSigil());

    new GLTFLoader(manager).load('/assets/stormbreaker.glb', (gltf) => this.installWeapon(gltf.scene), undefined, () => this.installWeapon(this.createFallbackWeapon()));
  }

  createFallbackSigil() {
    const material = new THREE.MeshBasicMaterial({ color: 0xf0d76a, transparent: true, opacity: 0, wireframe: true });
    this.sigilMaterial = material;
    this.sigilGlowMaterial = material.clone();
    this.sigil = new THREE.Mesh(new THREE.TorusKnotGeometry(1.3, 0.055, 180, 10, 2, 3), material);
    this.sigilRoot.add(this.sigil);
  }

  installWeapon(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    object.position.sub(center);
    object.scale.setScalar(3.6 / maxDimension);
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach((material) => {
        if ('envMapIntensity' in material) material.envMapIntensity = 1.8;
        if ('roughness' in material) material.roughness = Math.min(material.roughness ?? 0.55, 0.62);
      });
    });
    this.weaponRoot.add(object);
    this.weaponModel = object;
  }

  createFallbackWeapon() {
    const root = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x7d8995, metalness: 0.95, roughness: 0.28 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xc8e8f8, metalness: 1, roughness: 0.18, emissive: 0x163547 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4c2d19, roughness: 0.9 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.115, 3.6, 12), wood);
    handle.rotation.z = -0.12;
    handle.position.y = -0.45;
    root.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 0.58), metal);
    head.position.y = 1.25;
    head.rotation.z = -0.12;
    root.add(head);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 4), edge);
    blade.position.set(-1.02, 1.25, 0);
    blade.rotation.z = Math.PI / 2 - 0.12;
    root.add(blade);
    return root;
  }

  bindEvents() {
    this.onResize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      this.renderer.setSize(innerWidth, innerHeight, false);
      this.composer.setSize(innerWidth, innerHeight);
    };
    this.onPointerMove = (event) => {
      this.targetPointer.x = (event.clientX / innerWidth - 0.5) * 2;
      this.targetPointer.y = (event.clientY / innerHeight - 0.5) * -2;
    };
    addEventListener('resize', this.onResize, { passive: true });
    addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  setIntroProgress(progress) {
    this.introProgress = clamp(progress);
    this.introActive = this.introProgress < 1;
  }

  setScene(sceneFloat) {
    this.sceneFloat = clamp(sceneFloat, 0, STATES.length - 1);
    if (!this.introActive) this.applySceneState(this.sceneFloat);
  }

  applySceneState(sceneFloat, immediate = false) {
    const lower = Math.floor(sceneFloat);
    const upper = Math.min(STATES.length - 1, lower + 1);
    const t = sceneFloat - lower;
    const a = STATES[lower];
    const b = STATES[upper];
    this.targetCamera.fromArray(lerpArray(a.camera, b.camera, t));
    this.targetLookAt.fromArray(lerpArray(a.look, b.look, t));
    this.targetWeapon.position.fromArray(lerpArray(a.weapon, b.weapon, t));
    this.targetWeapon.rotation.set(...lerpArray(a.rotation, b.rotation, t));
    this.targetWeapon.scale = THREE.MathUtils.lerp(a.scale, b.scale, t);
    this.targetSigil.position.fromArray(lerpArray(a.sigil, b.sigil, t));
    this.targetSigil.scale = THREE.MathUtils.lerp(a.sigilScale, b.sigilScale, t);
    this.targetSigil.opacity = THREE.MathUtils.lerp(a.sigilOpacity, b.sigilOpacity, t);
    this.targetRingsOpacity = THREE.MathUtils.lerp(a.ringsOpacity, b.ringsOpacity, t);
    this.ringVelocity = THREE.MathUtils.lerp(0.22, 1.35, this.targetRingsOpacity);
    if (immediate) {
      this.camera.position.copy(this.targetCamera);
      this.lookAt.copy(this.targetLookAt);
      this.weaponRoot.position.copy(this.targetWeapon.position);
      this.weaponRoot.rotation.copy(this.targetWeapon.rotation);
      this.weaponRoot.scale.setScalar(this.targetWeapon.scale);
      this.sigilRoot.position.copy(this.targetSigil.position);
      this.sigilRoot.scale.setScalar(this.targetSigil.scale);
    }
  }

  strike(normalizedX = 0, intensity = 1) {
    const x = clamp(normalizedX, -1, 1) * 4.2;
    const points = [];
    const steps = 28;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      points.push(new THREE.Vector3(THREE.MathUtils.lerp(x + THREE.MathUtils.randFloatSpread(0.3), x * 0.18, t) + THREE.MathUtils.randFloatSpread(0.16 + t * 0.22), THREE.MathUtils.lerp(5.3, -2.8, t), THREE.MathUtils.randFloat(-0.4, 1.2)));
    }
    const material = new THREE.LineBasicMaterial({ color: intensity > 1.1 ? 0xf4e68e : 0xc9efff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    const group = new THREE.Group();
    group.add(line);
    for (let branchIndex = 0; branchIndex < 3; branchIndex += 1) {
      const start = THREE.MathUtils.randInt(7, 20);
      const origin = points[start];
      const branchPoints = [origin.clone()];
      for (let i = 1; i < 8; i += 1) branchPoints.push(new THREE.Vector3(origin.x + i * THREE.MathUtils.randFloat(-0.17, 0.17), origin.y - i * 0.13, origin.z + THREE.MathUtils.randFloatSpread(0.25)));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(branchPoints), material.clone()));
    }
    this.scene.add(group);
    this.lightningBursts.push({ group, age: 0, duration: 0.22 + intensity * 0.08 });
    this.flashLight.intensity = 95 * intensity;
    this.flashLight.position.x = x;
  }

  updateIntro(elapsed) {
    const p = this.introProgress;
    const sigilIn = THREE.MathUtils.smoothstep(p, 0.02, 0.36);
    const sigilOut = 1 - THREE.MathUtils.smoothstep(p, 0.52, 0.88);
    const weaponIn = THREE.MathUtils.smoothstep(p, 0.48, 0.82);
    this.targetCamera.set(0, 0.1, THREE.MathUtils.lerp(8.4, 5.8, p));
    this.targetLookAt.set(0, 0, -0.4);
    this.targetSigil.position.set(0, 0.15, -1.9);
    this.targetSigil.scale = THREE.MathUtils.lerp(0.42, 1.55, sigilIn);
    this.targetSigil.opacity = sigilIn * sigilOut * 0.9;
    this.targetWeapon.position.set(THREE.MathUtils.lerp(0, 1.35, weaponIn), THREE.MathUtils.lerp(4.8, -0.1, weaponIn), 0.1);
    this.targetWeapon.rotation.set(-0.12, -0.55, THREE.MathUtils.lerp(0.5, -0.62, weaponIn));
    this.targetWeapon.scale = weaponIn * 1.12;
    this.targetRingsOpacity = THREE.MathUtils.lerp(0.04, 0.48, p);
    this.ringVelocity = THREE.MathUtils.lerp(0.4, 2.6, p);
    if (p >= 1 && this.introActive) {
      this.introActive = false;
      this.applySceneState(this.sceneFloat);
    }
    this.sigilRoot.rotation.z = Math.sin(elapsed * 0.32) * 0.025;
  }

  updateAtmosphere(delta, elapsed) {
    this.pointer.lerp(this.targetPointer, 1 - Math.exp(-delta * 3.4));
    this.stars.rotation.y = elapsed * 0.004;
    this.stars.rotation.z = Math.sin(elapsed * 0.06) * 0.04;
    const rain = this.rain.geometry.attributes.position;
    for (let i = 1; i < rain.array.length; i += 3) {
      rain.array[i] -= delta * 4.7;
      if (rain.array[i] < -6) rain.array[i] = 8;
    }
    rain.needsUpdate = true;
    this.rings.children.forEach((ring, index) => {
      ring.rotation.z += delta * this.ringVelocity * (index % 2 ? -0.12 : 0.12);
      ring.position.z = ((ring.position.z + delta * this.ringVelocity * 4.2 + 16) % 16) - 16;
      const perspectiveScale = ring.userData.baseScale + Math.sin(elapsed * 0.8 + index) * 0.008;
      ring.scale.setScalar(perspectiveScale);
    });
  }

  updateLightning(delta) {
    this.flashLight.intensity = THREE.MathUtils.damp(this.flashLight.intensity, 0, 12, delta);
    this.lightningBursts = this.lightningBursts.filter((burst) => {
      burst.age += delta;
      const life = burst.age / burst.duration;
      burst.group.children.forEach((line, index) => { line.material.opacity = clamp((1 - life) * (index === 0 ? 1 : 0.55)); });
      burst.group.visible = life < 0.42 || (life > 0.58 && life < 0.75);
      if (life >= 1) {
        burst.group.traverse((child) => { child.geometry?.dispose(); child.material?.dispose(); });
        this.scene.remove(burst.group);
        return false;
      }
      return true;
    });
  }

  render = () => {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    if (this.introActive) this.updateIntro(elapsed);
    else this.applySceneState(this.sceneFloat);
    const damping = 1 - Math.exp(-delta * 4.2);
    this.camera.position.lerp(this.targetCamera, damping);
    this.lookAt.lerp(this.targetLookAt, damping);
    this.weaponRoot.position.lerp(this.targetWeapon.position, damping);
    this.weaponRoot.rotation.x = THREE.MathUtils.damp(this.weaponRoot.rotation.x, this.targetWeapon.rotation.x, 4.5, delta);
    this.weaponRoot.rotation.y = THREE.MathUtils.damp(this.weaponRoot.rotation.y, this.targetWeapon.rotation.y, 4.5, delta);
    this.weaponRoot.rotation.z = THREE.MathUtils.damp(this.weaponRoot.rotation.z, this.targetWeapon.rotation.z, 4.5, delta);
    this.weaponRoot.scale.setScalar(THREE.MathUtils.damp(this.weaponRoot.scale.x, this.targetWeapon.scale, 4.8, delta));
    this.weaponRoot.rotation.y += Math.sin(elapsed * 0.62) * 0.0008;
    this.weaponRoot.position.y += Math.sin(elapsed * 0.8) * 0.0008;
    this.sigilRoot.position.lerp(this.targetSigil.position, damping);
    this.sigilRoot.scale.setScalar(THREE.MathUtils.damp(this.sigilRoot.scale.x, this.targetSigil.scale, 4.3, delta));
    if (this.sigilMaterial) {
      this.sigilMaterial.opacity = THREE.MathUtils.damp(this.sigilMaterial.opacity, this.targetSigil.opacity, 5, delta);
      if (this.sigilGlowMaterial) this.sigilGlowMaterial.opacity = this.sigilMaterial.opacity * (0.2 + Math.sin(elapsed * 2.1) * 0.07);
    }
    this.ringMaterials.forEach((material, index) => { material.opacity = THREE.MathUtils.damp(material.opacity, (this.targetRingsOpacity ?? 0.05) * (index % 4 === 0 ? 0.7 : 0.38), 4, delta); });
    const pointerInfluence = innerWidth < 800 ? 0 : 0.12;
    this.camera.position.x += this.pointer.x * pointerInfluence;
    this.camera.position.y += this.pointer.y * pointerInfluence * 0.55;
    this.camera.lookAt(this.lookAt);
    this.updateAtmosphere(delta, elapsed);
    this.updateLightning(delta);
    this.keyLight.position.x = 3.5 + this.pointer.x * 1.6;
    this.bloom.strength = 0.72 + (this.targetRingsOpacity ?? 0) * 0.5 + this.flashLight.intensity * 0.002;
    this.composer.render();
    requestAnimationFrame(this.render);
  };
}
