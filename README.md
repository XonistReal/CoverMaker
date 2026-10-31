# CoverMaker

A browser tool for making underground rap cover art fast. Drop in a photo, tap a style, type your name and title, export a 3000 × 3000 file ready for DistroKid, Spotify, Apple Music or SoundCloud.

Everything runs locally in the browser (no account, no upload). Your current cover autosaves in the browser, so a refresh doesn't lose work.

## What it does

- **24 one-tap styles**, each previewed live on your own photo: Night Vision, Chrome Gothic, Point & Shoot, Webcam, Red Duotone, Engraving, Xerox Zine, Red Triangle, Halo Text, Gradient Void, Lights Off, Airbrush Glow, Framed, Kaleidoscope, Crayon Scrawl, Sticker Bomb, VHS Rip, Blood & Bone, Spray Tag, Psych Poster, Wet Paint, Halftone Print, Heat Map, Clean. **Random** rolls a different style with fresh seeds and a sibling typeface.
- **Artist / title / tracklist fields** that every style uses. Change your title once and every linked text layer updates.
- **Type**: 70 Google Fonts sorted into Gothic, Bold, Serif, Hand, Graffiti, Horror, Digital and Psych. Fills: solid, gradient, chrome, gold, ice, outline-only. Outline, glow, drop shadow, 3D depth, arc / circle / wave paths, letter spacing, stretch, hand-made wobble, shrink-to-fit.
- **Photo tools**: B&W, brightness, contrast, color tint, remove white/black background, circle/triangle/diamond/arch masks, sticker border, drop shadow, flip, fill/fit.
- **Effects (WebGL, live)**: night vision, thermal, duotone, tint, invert, x-ray, sepia; exposure, contrast, crushed blacks, faded blacks, saturation, hue, warmth, sharpen; flash, vignette, glow, soft blur, color split; grain, dust & scratches, scanlines, VHS wobble, low-res webcam, JPEG crunch, pixelate; 1-bit, dither, halftone, engraving, posterize; mirror and kaleidoscope.
- **Stickers**: parental advisory label, E tag, camcorder REC overlay, CCTV timestamp, blood splatter, paint drips, sparkle glints, lens flare, barbed wire, crayon scribble, tape, barcode, dust & scratches. Random ones can be rerolled.
- **Shapes**: box, circle, triangle, star, cross, upside-down cross, heart, diamond, frame, line, with a hand-drawn wobble option.
- **Draw**: crayon, marker, spray paint, pixel and eraser brushes.
- **Editing**: drag, corner-scale, rotate knob (snaps to 45°), two-finger pinch on phones, center snapping guides, layers with hide/lock/reorder, blend modes, "keep crisp" to keep a layer above the grain and color effects, undo/redo.
- **Export**: 3000 / 1600 / 1080 px, JPG or PNG, optional parental advisory label. Every export re-renders at full size; it's never an upscaled preview.

### Shortcuts

| Keys | Action |
| --- | --- |
| Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z | Undo, redo |
| Delete / Backspace | Delete selected layer |
| Ctrl/Cmd + D | Duplicate layer |
| Arrow keys (Shift for 10) | Nudge |
| Esc | Deselect / stop drawing |
| Shift while dragging | Turn off snapping |
| Paste or drag-and-drop an image | Add a photo |

## Why these tools: notes from recent Nettspend, OsamaSon and Che covers

I pulled the artwork for their 2024–2026 releases and looked for the moves that keep repeating. Each one became a tool or a style.

| What keeps showing up | Examples | Where it lives in CoverMaker |
| --- | --- | --- |
| Lo-fi camera looks: harsh on-camera flash, underexposed blue-black photos with heavy noise, crunchy low-res webcam selfies | Nettspend *gone too soon*, *early life crisis*, *F\*CK SWAG*; Che *Pizza Time*, *Sayso Says* | Point & Shoot, Lights Off, Webcam styles; Flash, Crush blacks, Grain, Low-res, JPEG crunch |
| Night vision / CCTV with a timestamp burned in | OsamaSon *DEMON HOME* | Night Vision style, Timestamp and Camcorder stickers, Scanlines |
| Chrome or glowing blackletter over black | OsamaSon *3vil Reflection* | Chrome Gothic style, chrome/ice/gold fills, Gothic fonts, Sparkle sticker |
| Tiny serif caps, centered, with one bold geometric shape | OsamaSon *psykotic* | Red Triangle style, Triangle shape, photo masks |
| Text running around a circle on plain paper, tracklist included | OsamaSon *grails* | Halo Text style, arc/circle text paths, tracklist field |
| Monochrome tint plus a giant condensed title cropped at the bottom | OsamaSon *just score it* | Red Duotone style, photo tint, Anton/Bebas/League Gothic, Stretch |
| 70s doom-rock poster lettering and saturated color | OsamaSon *Jump Out* | Psych Poster style, wave text path, 3D depth, gradient fill |
| Paint drips and spray-painted words | OsamaSon *The Whole World Is Free*; Nettspend *withdrawals* | Wet Paint and Spray Tag styles, Drips sticker, Graffiti fonts |
| Crayon / MS-Paint drawings on flat color | Nettspend *HIM*, *Virginia Creeper* | Crayon Scrawl style, crayon brush, Scribble sticker, hand-drawn shape wobble |
| Maximal sticker collages and mirrored mandalas | Nettspend *BAD ASS F\*CKING KID*; Che *Love (MKB)* | Sticker Bomb and Kaleidoscope styles, sticker borders, tape, mirror modes |
| 1-bit engraving and white line-art on black | Che *Empty Clip*, *Fully Loaded* | Engraving and Xerox Zine styles, 1-bit, dither, halftone, engrave |
| Purple airbrush glow, lens flare, chromatic fringing | Che *REST IN BASS* | Airbrush Glow style, Glow, Color split, Lens flare sticker |
| B&W airbrush with fresh red blood | Che *RichPhønks*, *Crueger* | Blood & Bone style, Splatter sticker, "keep crisp" so the red survives the B&W |
| A framed painting hung on a loud solid wall | Che *Para'dies* | Framed style, sticker border + drop shadow |
| Almost nothing: a gradient and grain, or plain black | Nettspend *Impact*; Che *Million Dollar Mansion* | Gradient Void and Clean styles |
| Parental advisory label in the corner | Nearly all of them | One checkbox on the Export tab, or Add → Stickers |

The styles are built from these techniques. They don't copy any artwork, and no cover images ship with the app.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # writes dist/index.html, a single self-contained page
```

`dist/index.html` is one file. It loads React from cdnjs and fonts from Google Fonts, and everything else is inlined. Host it anywhere static: GitHub Pages, Netlify, Vercel, or just open it.

### GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main` or `master`. Turn it on once in the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## How it's built

- `src/render/compose.ts` draws the background and layers with Canvas 2D at any size (the doc is always 1000 × 1000 units), runs the effect stack, then draws "keep crisp" layers on top.
- `src/render/fx.ts` is the WebGL effect pipeline: geometry → resample → color → glow/blur → print look → final (grain, VHS, flash, vignette).
- `src/render/text.ts`, `stickers.ts`, `shapes.ts`, `brushes.ts` are the procedural drawing code. Random elements use seeded noise so they render the same every frame and at export.
- `src/presets.ts` defines the styles. Each one is a background, an effect setting, how to place your photo, and the text/sticker layers it adds.
- `src/store.ts` holds the document, undo history and selection; `src/lib/persist.ts` autosaves to IndexedDB.
