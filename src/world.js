import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

const assetUrl = (path) => new URL(`./assets/${path}`, document.baseURI).href;

async function readWithProgress(response, onProgress) {
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !total) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received / total);
  }
  const output = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output.buffer;
}

function isGlb(buffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  return bytes.length === 4 && String.fromCharCode(...bytes) === 'glTF';
}

function decodeBase64(source) {
  const clean = source.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export class ThorWorld {
  constructor(canvas, { onProgress = () => {}, onStatus = () => {} } = {}) {
    this.canvas = canvas;
    this.onProgress = onProgress;
    this.onStatus = onStatus;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.dragging = false;
    this.dragStart = new THREE.Vector2();
    this.dragRotation = new THREE.Vector2();
    this.modelReady = false;
    this.disposed = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02050a);
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.037);

    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 120);
    this.camera.position.set(0, 0.15, 8.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.68, 0.72, 0.54);
    this.composer.addPass(this.bloom);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.createLights();
    this.createAtmosphere();
    this.createBifrost();
    this.createModelStage();
    this.loadSigilTexture();
    this.bindPointer();
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    requestAnimationFrame(this.animate);

    this.ready = this.loadStormbreaker();
  }

  createLights() {
    this.ambient = new THREE.HemisphereLight(0x7ebfe5, 0x100b08, 1.2);
    this.scene.add(this.ambient);
    this.keyLight = new THREE.DirectionalLight(0xeaf8ff, 5.2);
    this.keyLight.position.set(4.5, 6.5, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight);
    this.goldLight = new THREE.PointLight(0xe0ad32, 36, 18, 2);
    this.goldLight.position.set(-3.5, 0.8, 3.4);
    this.scene.add(this.goldLight);
    this.rimLight = new THREE.PointLight(0x58bfff, 44, 20, 2);
    this.rimLight.position.set(4, 1.5, -2.5);
    this.scene.add(this.rimLight);
    this.lightTarget = new THREE.Object3D();
    this.scene.add(this.lightTarget);
    this.keyLight.target = this.lightTarget;
  }

  createAtmosphere() {
    const count = innerWidth < 700 ? 900 : 1900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = -Math.random() * 34 + 8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xa7d8f4, size: 0.026, transparent: true, opacity: 0.45, depthWrite: false }));
    this.scene.add(this.stars);

    const rainCount = innerWidth < 700 ? 350 : 900;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i += 1) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 22;
      rainPositions[i * 3 + 1] = Math.random() * 20 - 7;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0x82cfff, size: 0.018, transparent: true, opacity: 0.24, depthWrite: false }));
    this.rain.scale.y = 4.8;
    this.scene.add(this.rain);
  }

  createBifrost() {
    this.bifrost = new THREE.Group();
    this.bifrost.position.z = -7;
    this.scene.add(this.bifrost);
    this.bifrostMaterials = [];
    for (let i = 0; i < 13; i += 1) {
      const radius = 1.1 + i * 0.62;
      const material = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xd8b33f : 0x5dbcf4, transparent: true, opacity: 0.05 + i * 0.002, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, i % 3 === 0 ? 0.015 : 0.008, 6, 160), material);
      ring.rotation.set(Math.PI * 0.5 + (i % 2) * 0.08, 0.08 * Math.sin(i), i * 0.17);
      ring.position.z = -i * 0.16;
      this.bifrost.add(ring);
      this.bifrostMaterials.push(material);
    }
  }

  createModelStage() {
    this.modelPivot = new THREE.Group();
    this.modelPivot.position.set(2.5, -0.25, 0);
    this.modelPivot.rotation.set(-0.12, -0.35, -0.74);
    this.scene.add(this.modelPivot);
    this.modelInteraction = new THREE.Group();
    this.modelPivot.add(this.modelInteraction);
    this.modelMount = new THREE.Group();
    this.modelInteraction.add(this.modelMount);
    this.modelGlow = new THREE.PointLight(0x8ddcff, 0, 8, 2);
    this.modelPivot.add(this.modelGlow);
  }

  async loadSigilTexture() {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(assetUrl('asgard-mark.png'));
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, color: 0xe8c95c, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
      this.sigilSprite = new THREE.Sprite(material);
      this.sigilSprite.scale.set(8, 7.6, 1);
      this.sigilSprite.position.set(0, 0, -5.8);
      this.scene.add(this.sigilSprite);
    } catch {
      this.sigilSprite = null;
    }
  }

  parseGlb(buffer) {
    return new Promise((resolve, reject) => {
      new GLTFLoader().parse(buffer, document.baseURI, (gltf) => resolve(gltf.scene), reject);
    });
  }

  async fetchPrimaryGlb() {
    this.onStatus('Loading the supplied Stormbreaker GLB');
    const response = await fetch(assetUrl('stormbreaker.glb'), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Stormbreaker request failed with ${response.status}`);
    const buffer = await readWithProgress(response, (value) => this.onProgress(0.12 + value * 0.62));
    if (!isGlb(buffer)) throw new Error('Stormbreaker response is not a valid GLB file');
    return buffer;
  }

  async fetchEncodedGlb() {
    this.onStatus('Reassembling Stormbreaker from source chunks');
    const chunks = [];
    for (let index = 1; index <= 20; index += 1) {
      const response = await fetch(assetUrl(`encoded/stormbreaker.glb.b64.part${String(index).padStart(2, '0')}`), { cache: 'force-cache' });
      if (!response.ok) {
        if (chunks.length) break;
        throw new Error(`Encoded Stormbreaker source is unavailable (${response.status})`);
      }
      chunks.push(await response.text());
      this.onProgress(0.14 + Math.min(index / 8, 1) * 0.6);
    }
    if (!chunks.length) throw new Error('No Stormbreaker source chunks were found');
    const buffer = decodeBase64(chunks.join(''));
    if (!isGlb(buffer)) throw new Error('Reassembled Stormbreaker has an invalid GLB header');
    return buffer;
  }

  async loadStormbreaker() {
    this.onProgress(0.08);
    let buffer;
    let primaryError;
    try {
      buffer = await this.fetchPrimaryGlb();
    } catch (error) {
      primaryError = error;
      buffer = await this.fetchEncodedGlb();
    }
    this.onStatus('Forging materials and geometry');
    this.onProgress(0.82);
    let object;
    try {
      object = await this.parseGlb(buffer);
    } catch (error) {
      if (!primaryError) object = await this.parseGlb(await this.fetchEncodedGlb());
      else throw error;
    }
    this.installModel(object);
    this.onProgress(1);
    this.onStatus('Stormbreaker is ready');
    return object;
  }

  installModel(object) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) < 0.0001) throw new Error('Stormbreaker GLB contains no visible geometry');
    object.position.sub(center);
    object.scale.setScalar(4.7 / Math.max(size.x, size.y, size.z));
    let meshCount = 0;
    object.traverse((child) => {
      if (!child.isMesh) return;
      meshCount += 1;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials.filter(Boolean)) {
        material.needsUpdate = true;
        if ('envMapIntensity' in material) material.envMapIntensity = Math.max(1.7, material.envMapIntensity || 0);
        if ('roughness' in material) material.roughness = Math.min(0.68, material.roughness ?? 0.55);
      }
    });
    if (!meshCount) throw new Error('Stormbreaker GLB did not contain mesh nodes');
    this.modelMount.clear();
    this.modelMount.add(object);
    this.modelObject = object;
    this.modelReady = true;
  }

  bindPointer() {
    addEventListener('pointermove', (event) => {
      this.pointerTarget.set((event.clientX / innerWidth) * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
      if (this.dragging) {
        this.dragRotation.x += (event.clientX - this.dragStart.x) * 0.004;
        this.dragRotation.y += (event.clientY - this.dragStart.y) * 0.003;
        this.dragStart.set(event.clientX, event.clientY);
      }
    }, { passive: true });
    addEventListener('pointerdown', (event) => {
      if (scrollY < innerHeight * 1.7) {
        this.dragging = true;
        this.dragStart.set(event.clientX, event.clientY);
      }
    });
    addEventListener('pointerup', () => { this.dragging = false; });
  }

  strike({ x = 0, y = -0.6, z = 0, intensity = 1 } = {}) {
    const group = new THREE.Group();
    const points = [];
    const start = new THREE.Vector3(x + (Math.random() - 0.5) * 1.8, 7.2, z - 1.5);
    const end = new THREE.Vector3(x, y, z);
    const segments = 18;
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const point = start.clone().lerp(end, t);
      const taper = Math.sin(t * Math.PI);
      point.x += (Math.random() - 0.5) * 0.65 * taper;
      point.z += (Math.random() - 0.5) * 0.45 * taper;
      points.push(point);
    }
    const material = new THREE.LineBasicMaterial({ color: 0xcdf5ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    for (let branchIndex = 0; branchIndex < 5; branchIndex += 1) {
      const from = points[3 + Math.floor(Math.random() * (segments - 6))];
      const branchPoints = [from.clone()];
      const direction = Math.random() > 0.5 ? 1 : -1;
      for (let i = 1; i <= 5; i += 1) branchPoints.push(new THREE.Vector3(from.x + direction * i * (0.12 + Math.random() * 0.1), from.y - i * 0.12, from.z + (Math.random() - 0.5) * 0.25));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(branchPoints), material.clone()));
    }
    this.scene.add(group);
    this.modelGlow.intensity = 55 * intensity;
    this.rimLight.intensity = 90 * intensity;
    gsap.to(group.children.map((child) => child.material), { opacity: 0, duration: 0.34, delay: 0.05, stagger: 0.015, ease: 'power3.out', onComplete: () => {
      this.scene.remove(group);
      group.traverse((child) => { child.geometry?.dispose(); child.material?.dispose(); });
    }});
    gsap.to(this.modelGlow, { intensity: 0, duration: 1.25, ease: 'power2.out' });
    gsap.to(this.rimLight, { intensity: 44, duration: 1.4, ease: 'power2.out' });
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setSize(innerWidth, innerHeight);
  }

  animate() {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.pointer.lerp(this.pointerTarget, 0.045);
    if (this.modelReady) {
      const idle = this.dragging ? 0 : Math.sin(time * 0.85) * 0.025;
      this.modelInteraction.rotation.y += (this.dragRotation.x + this.pointer.x * 0.07 + idle - this.modelInteraction.rotation.y) * 0.035;
      this.modelInteraction.rotation.x += (this.dragRotation.y - this.pointer.y * 0.035 - this.modelInteraction.rotation.x) * 0.025;
    }
    this.camera.position.x += (this.pointer.x * 0.13 - this.camera.position.x) * 0.02;
    this.camera.position.y += (0.15 + this.pointer.y * 0.06 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);
    this.stars.rotation.y = time * 0.003;
    const rainPosition = this.rain.geometry.attributes.position;
    for (let i = 1; i < rainPosition.array.length; i += 3) {
      rainPosition.array[i] -= delta * 4.5;
      if (rainPosition.array[i] < -7) rainPosition.array[i] = 13;
    }
    rainPosition.needsUpdate = true;
    this.bifrost.rotation.z = time * 0.008;
    this.bifrost.children.forEach((ring, index) => { ring.rotation.z += delta * (index % 2 ? -0.025 : 0.018); });
    if (this.sigilSprite) this.sigilSprite.material.opacity = 0.065 + Math.sin(time * 0.6) * 0.015;
    this.composer.render();
    requestAnimationFrame(this.animate);
  }
}
