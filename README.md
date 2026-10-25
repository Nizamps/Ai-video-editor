# ClipForge AI — Edit at the speed of imagination

ClipForge AI is a browser-based, multitrack AI video editor inspired by CapCut's workflow combined with a frame-accurate non-linear editing (NLE) timeline, real-time HTML5 Canvas 2D compositing, keyframe animation, visual effects, transitions, and a conversational AI timeline agent.

## Architecture & Repository Structure

- `src/types/editor.ts` — Shared TypeScript interfaces for projects, tracks, clips, keyframes, effects, transitions, and AI tool schemas.
- `src/editor/timebase.ts` — Frame-accurate rational timebase math, SMPTE timecode formatting (`HH:MM:SS:FF`), clip splitting, edge trimming, ripple deletion, and magnetic snapping.
- `src/editor/store.ts` — Zustand global state engine with operation-based Undo/Redo history and atomic AI plan execution.
- `src/preview/renderEngine.ts` & `src/preview/PreviewCompositor.tsx` — Unified real-time Canvas 2D + Web Audio compositor with interactive transform gizmo and safe-area guides.
- `src/effects/registry.ts` — Nondestructive Basic, Gaming/Social, and Cinematic effects + Color Grading LUT presets.
- `src/transitions/registry.ts` — Basic, Motion, and Stylized transitions rendered across clip boundaries.
- `src/animation/keyframes.ts` — Keyframe interpolation engine (`linear`, `ease-in`, `ease-out`, `ease-in-out`, `bounce`, `hold`) and animation presets.
- `src/ai/tools.ts` — Strict TypeScript tool validator (`validateAIOperation`) and grounded natural-language timeline edit planner.
- `src/export/exporter.ts` — Real browser video rendering pipeline (`Canvas.captureStream` + `MediaRecorder` / WebCodecs capability detection) with frame progress, ETA, cancellation, and `.webm`/`.mp4` download.
- `src/storage/projectStorage.ts` — IndexedDB autosave, project `.clipforge.json` import/export, and `.srt`/`.vtt` subtitle parsing/export.
- `server.ts` — Express + Vite full-stack server providing `/api/ai/plan` and `/api/ai/status` so API keys remain strictly server-side.
- `tests/editor.test.ts` — Unit test suite covering timebase math, clip splitting/trimming, ripple deletion, keyframe interpolation, and AI operation validation.

## Local Development

```bash
# Install dependencies
npm install

# Run full-stack development server on http://localhost:3000
npm run dev

# Run TypeScript check
npm run lint

# Run unit tests
npm test

# Build production bundle
npm run build
```

## Security, Privacy & Deployment

1. **No Client-Side Secrets**: API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) live exclusively in server-side environment variables (`.env`) and are never bundled into frontend code.
2. **GitHub Pages Static Deployment**: The `.github/workflows/deploy.yml` workflow runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` before deploying `dist/` to GitHub Pages. When hosted statically without a backend, ClipForge AI automatically falls back to its built-in deterministic timeline planner.
3. **Browser Media Processing**: Imported video, audio, and image files remain in local browser memory (`URL.createObjectURL`) and IndexedDB metadata without uploading raw footage to external servers.
