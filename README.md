# Thor Portfolio

A cinematic, Thor-inspired portfolio for Abhishek Singh Chauhan. The experience is driven by a persistent Three.js scene, the supplied Stormbreaker GLB and Asgard sigil, GSAP ScrollTrigger and Lenis.

## Experience

- Asgard sigil opening cinematic with lightning, bloom and a Stormbreaker arrival
- Fixed WebGL world with scroll-directed camera and weapon choreography
- Pinned horizontal project sagas
- Orbital skill arsenal and Bifrost finale
- Procedural optional thunder audio
- Reduced-motion and responsive layouts

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

The supplied binary assets are reconstructed from the repository-safe encoded source files before development and production builds. This fixes the previous local-development issue where the Asgard sigil and Stormbreaker paths did not exist.

## Production

```bash
npm run build
npm run preview
```

The built site is written to `dist/` and is ready for Vercel or any static host.

## Stack

- Three.js with GLTFLoader and UnrealBloomPass
- GSAP and ScrollTrigger
- Lenis smooth scrolling
- Vite 8
- Web Audio procedural thunder
