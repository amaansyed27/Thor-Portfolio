# Thor Portfolio

A cinematic, Thor-inspired portfolio for **Abhishek Singh Chauhan**, built around a custom
Stormbreaker GLB and Asgard triquetra mark.

## Experience

- Lightning-and-thunder opening cinematic with a skippable Asgard reveal
- Interactive 3D Stormbreaker hero, with scroll-linked camera movement
- Full-screen project sagas with bespoke voice, orbit and radar motion systems
- Cinematic section transitions, parallax typography, realm progress and Bifrost finale
- Responsive mobile treatment and `prefers-reduced-motion` support
- Optional, user-activated procedural storm atmosphere

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Production build

```bash
npm run build
npm run preview
```

The static production output is written to `dist/`.

## Asset packaging

The repository stores the supplied binary artwork as base64 source parts so it can be
committed through GitHub's text contents API. The zero-dependency build script reconstructs:

- `dist/assets/asgard-mark.png`
- `dist/assets/stormbreaker.glb`

The generated `dist/` assets are byte-identical to the originals.

## Stack

Vanilla ES modules, semantic HTML, CSS animation, Canvas 2D lightning, Web Audio ambience
and the pinned [`<model-viewer>` v4.2.0](https://github.com/google/model-viewer/releases/tag/v4.2.0)
web component.
