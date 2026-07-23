# Thor Portfolio

A cinematic portfolio for **Abhishek Singh Chauhan**, rebuilt from the ground up around the supplied Stormbreaker GLB and Asgard triquetra.

## Stack

- Three.js WebGL world and GLTFLoader
- GSAP ScrollTrigger camera choreography
- Lenis smooth scrolling
- Vite production build
- Web Audio thunder

## Asset reliability

`npm run dev` and `npm run build` reconstruct the supplied binary assets from the committed source chunks. The browser loader also has a second path: when `/assets/stormbreaker.glb` is missing or invalid, it reconstructs the same GLB from the source chunks in memory and parses it directly.

A failed model load is never hidden behind empty orbit graphics. The opening remains on a visible error state with the exact reason and a retry action.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.
