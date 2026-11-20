# Little Tokyo kit

**Building with this? Read `API.md` (one paragraph: the whole API of kit.mjs, stage.mjs and clips.mjs) and stop.**
Three lines build the place: `import { buildKit } from './kit.mjs'; const place = await buildKit({ folder: './' }); scene.add(place.group);`. The rest of this file is reference.

https://polyfork.dev/kit/japanese-suburban-city-street-baa482

57 of 57 parts, packed 2026-11-17.
Kits fill up over time: if this says fewer parts than the site does, re-download.

## What is in this folder

Every part twice: `<part>.glb` for any engine, `<part>.mjs` as a drop-in three.js
module with its options. `scene.glb` is the composed kit scene, the whole thing
arranged as one file.

BUILD THE WHOLE PLACE IN ONE CALL. `kit.mjs` in this folder does it:

```js
import { buildKit } from './kit.mjs';          // serve this folder over http
const place = await buildKit({ folder: './' });   // all 524 placements, merged to a few draw calls
scene.add(place.group);                        // then place.tick(elapsedSeconds) in your loop
```

You get `place.bounds`, `place.boxes()` (a Box3 per placement tall enough to walk into),
`place.of(key)`, `place.terrain` with `place.groundAt(x, z)`, and the placed people idling.
LIGHT IT WITH `stage.mjs`, not with ACES tone mapping at exposure 1: these colours are authored for
no tone mapping under a hemisphere, a warm key and a cool rim, and the usual tutorial rig turns them
muddy. `const look = stage(renderer, scene, { time: 'day' }); look.shadows(place.group);
look.ground(place); await place.surround(); look.follow(player);` then `look.update()` each frame.
`look.setTime(0..1)` runs day to night. `place.surround()` scatters the kit's own trees past its edge.

`clips.mjs` makes any of the humanoids walk: `const anim = await animate(character);
anim.locomotion(metresPerSecond)`. The page needs an import map for `three` and `three/addons/`.

`LAYOUT.json` is the composition: 524 placements of 41 parts, the arrangement
every picture of this kit was taken in. Each row is a part key, a position in
metres (`x`,`y`,`z`, Y up), rotations in degrees (`ry` about Y, and `rx`/`rz` where
present, applied in XYZ order: an upright turn can be written rx = rz = 180 with ry),
an optional scale `s`, and `params` — the knob values
that placement was built with, where they differ from the part's defaults.

```js
for (const p of LAYOUT) {
  const o = createAsset({ THREE, ...(p.params || {}) });   // from `${p.part}.mjs`
  o.position.set(p.x, p.y, p.z);
  const D = Math.PI / 180;   // all three, XYZ order (three.js's default): some upright rows say rx = rz = 180
  o.rotation.set((p.rx || 0) * D, (p.ry || 0) * D, (p.rz || 0) * D);
  if (p.s) o.scale.setScalar(p.s);
  scene.add(o);
}
```

The row whose part is `_terrain` is the ground rather than a model: it carries a
`module` and the knobs `terrain.mjs` was generated with.

## Using them together

The kit agrees on the knobs below. Knobs not listed here are local to one part, vary them freely.

- **`colorway`** (54 of 57 parts): 54 different option sets. Every part has this knob and its values are curated for that part, so a
  value from one part is not valid on another. Each `.mjs` lists its own in the header.

Snap positions to the 4m grid and rotate in 90 degree steps: tiles are whole 4m modules with flush edges, so copies butt seamlessly. Walkable tops meet at y=0. The scene editor at https://polyfork.dev/editor snaps to this automatically.

**Scale.** Everything snaps to a 4 m grid: all ground tiles are exactly 4x4 m and 0.05 m thick, every building footprint is an integer multiple of 4 m with flat side walls right on the footprint edge, storeys are exactly 3 m so roof lines land at N x 3 m, doorways are 2.0 m tall and shopfronts 2.6 m, and all bolt-on facade parts (awnings, shutters, signboards, air-con units) are sized to a 4 m bay and a 3 m floor pitch.

**Palette.** `#2E3134`, `#3C4145`, `#4E5459`, `#6B7278`, `#8A9197`, `#D8DADD`, `#E4E6E6`, `#F0EFEC`, `#F7F5EF`, `#ECE8DE`, `#B9A88C`, `#8C7355`, `#63503C`, `#42352A`, `#7E4B33`, `#B5462F`, `#D6452F`, `#8E1F1B`, `#2F6B4F`, `#3F8A5E`, `#6FA860`, `#9CC46B`, `#F7C9D6`, `#F2A8BE`, `#E07E9E`, `#5B6E8C`, `#8FB4C9`, `#E3EDF2`, `#F0C24B`, `#E8853A`, `#ECE9E2`, `#1B1D20`

## Parts

57 parts. `PARTS.json` beside this file lists each one on one line: file, size, knobs with their options and defaults, colour zones, rig nodes, lit zones. `grep '"<key>"' PARTS.json` rather than opening its `.mjs`.

Every part also has its own page with renders and live options:
https://polyfork.dev/kit/japanese-suburban-city-street-baa482

## Building this with an AI agent?

Point it at https://polyfork.dev/prompt.txt. The same assembly contract above is
machine-readable at https://polyfork.dev/api/kits/japanese-suburban-city-street-baa482 (the `usage` field), and it
updates as the kit fills up, which this file does not.
