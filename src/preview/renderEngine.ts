import { MediaAsset, ProjectData, TimelineClip } from '../types/editor';
import { getAnimatedClipValues } from '../animation/keyframes';
import { drawProceduralVideoFrame } from '../media/sampleAssets';

export interface MediaElementCache {
  videos: Map<string, HTMLVideoElement>;
  images: Map<string, HTMLImageElement>;
}

/**
 * Renders the complete project composition at `timelineTime` onto `ctx` (dimensions `canvasWidth` × `canvasHeight`).
 * Used identically by both the interactive Preview Monitor and the MediaRecorder/WebCodecs Export Pipeline.
 */
export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: ProjectData,
  timelineTime: number,
  mediaCache: MediaElementCache,
  options: {
    showSafeGuides?: boolean;
    selectedClipId?: string | null;
    burnCaptions?: boolean;
  } = {}
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scaleRatioX = w / (project.width || 1920);
  const scaleRatioY = h / (project.height || 1080);

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // 1. Background fill
  if (project.backgroundFill === 'charcoal') {
    ctx.fillStyle = '#12151E';
  } else if (project.backgroundFill === 'indigo') {
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
  } else {
    ctx.fillStyle = '#050608';
  }
  ctx.fillRect(0, 0, w, h);

  // 2. Sort visible tracks bottom-to-top (higher order = lower layer, so video is below overlay & text)
  const visibleTrackIds = new Set(
    project.tracks.filter((t) => t.visible && !t.muted).map((t) => t.id)
  );
  const trackOrderMap = new Map(project.tracks.map((t) => [t.id, t.order]));

  const activeClips = project.clips
    .filter((c) => {
      if (!visibleTrackIds.has(c.trackId)) return false;
      if (c.type === 'audio') return false;
      if (options.burnCaptions === false && c.type === 'text') return false;
      return timelineTime >= c.startTime && timelineTime <= c.startTime + c.duration;
    })
    .sort((a, b) => {
      const orderA = trackOrderMap.get(a.trackId) ?? 0;
      const orderB = trackOrderMap.get(b.trackId) ?? 0;
      // Render higher track.order (e.g. Video V1 order=2) first, then Overlays (order=1), then Captions (order=0)
      return orderB - orderA;
    });

  // 3. If backgroundFill === 'blur' and aspect is vertical/square, draw soft blurred backdrop from first active video clip
  if (project.backgroundFill === 'blur' && project.aspectRatio !== '16:9') {
    const firstVideoClip = activeClips.find((c) => c.type === 'video');
    if (firstVideoClip) {
      const asset = project.assets.find((a) => a.id === firstVideoClip.assetId);
      if (asset) {
        ctx.save();
        ctx.filter = 'blur(8px) brightness(0.45)';
        ctx.translate(w / 2, h / 2);
        ctx.scale(1.35, 1.35);
        ctx.translate(-w / 2, -h / 2);
        drawClipMediaSource(ctx, firstVideoClip, asset, timelineTime, w, h, mediaCache);
        ctx.restore();
      }
    }
  }

  // 4. Render each active clip layer
  for (const clip of activeClips) {
    renderSingleClipLayer(ctx, clip, project, timelineTime, w, h, scaleRatioX, scaleRatioY, mediaCache);
  }

  // 5. Optional Safe Area Guides (Action Safe 90%, Title Safe 80%, Vertical Social UI Zones)
  if (options.showSafeGuides) {
    drawSafeAreaGuides(ctx, w, h, project.aspectRatio);
  }

  ctx.restore();
}

function renderSingleClipLayer(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  project: ProjectData,
  timelineTime: number,
  w: number,
  h: number,
  scaleRatioX: number,
  scaleRatioY: number,
  mediaCache: MediaElementCache
) {
  ctx.save();

  const anim = getAnimatedClipValues(clip, timelineTime);
  const localTime = anim.localTime;
  const enabledEffects = clip.effects.filter((e) => e.enabled);

  // Transition progress calculations
  let transScaleMult = 1;
  let transOffsetX = 0;
  let transOffsetY = 0;
  let transRotation = 0;
  let transAlphaMult = 1;
  let transFlashColor: string | null = null;
  let transFlashAlpha = 0;

  if (clip.transitionIn && localTime < clip.transitionIn.duration && clip.transitionIn.duration > 0) {
    const p = localTime / clip.transitionIn.duration; // 0 -> 1
    const inv = 1 - p;
    switch (clip.transitionIn.transitionId) {
      case 'cross-dissolve':
        transAlphaMult *= p;
        break;
      case 'fade-black':
        transFlashColor = '#000000';
        transFlashAlpha = inv;
        break;
      case 'fade-white':
      case 'flash-impact':
        transFlashColor = '#FFFFFF';
        transFlashAlpha = inv * 0.9;
        break;
      case 'zoom-in-trans':
        transScaleMult *= 0.65 + 0.35 * p;
        transAlphaMult *= p;
        break;
      case 'zoom-out-trans':
        transScaleMult *= 1.45 - 0.45 * p;
        transAlphaMult *= p;
        break;
      case 'whip-left':
        transOffsetX += inv * w * 0.65;
        break;
      case 'whip-right':
        transOffsetX -= inv * w * 0.65;
        break;
      case 'push-up':
        transOffsetY += inv * h * 0.65;
        break;
      case 'spin-whirl':
        transRotation += inv * -90;
        transScaleMult *= 0.7 + 0.3 * p;
        break;
      case 'light-leak-burn':
        transFlashColor = '#F97316';
        transFlashAlpha = inv * 0.75;
        break;
    }
  }

  const timeRem = clip.duration - localTime;
  if (clip.transitionOut && timeRem < clip.transitionOut.duration && clip.transitionOut.duration > 0) {
    const p = 1 - timeRem / clip.transitionOut.duration; // 0 -> 1
    switch (clip.transitionOut.transitionId) {
      case 'cross-dissolve':
        transAlphaMult *= 1 - p;
        break;
      case 'fade-black':
        transFlashColor = '#000000';
        transFlashAlpha = Math.max(transFlashAlpha, p);
        break;
      case 'fade-white':
      case 'flash-impact':
        transFlashColor = '#FFFFFF';
        transFlashAlpha = Math.max(transFlashAlpha, p * 0.9);
        break;
      case 'zoom-in-trans':
        transScaleMult *= 1 + p * 0.55;
        transAlphaMult *= 1 - p * 0.5;
        break;
      case 'whip-left':
        transOffsetX -= p * w * 0.65;
        break;
      case 'whip-right':
        transOffsetX += p * w * 0.65;
        break;
      case 'push-up':
        transOffsetY -= p * h * 0.65;
        break;
      case 'light-leak-burn':
        transFlashColor = '#FB7185';
        transFlashAlpha = Math.max(transFlashAlpha, p * 0.75);
        break;
    }
  }

  // Camera shake & beat zoom punch effects
  let shakeX = 0;
  let shakeY = 0;
  let effectZoomMult = 1;

  for (const eff of enabledEffects) {
    if (eff.effectId === 'camera-shake') {
      const amp = (eff.params.amplitude ?? 14) * scaleRatioX;
      const freq = eff.params.frequency ?? 12;
      shakeX += Math.sin(timelineTime * freq * Math.PI * 2) * amp;
      shakeY += Math.cos(timelineTime * (freq * 1.3) * Math.PI * 2) * amp * 0.75;
    } else if (eff.effectId === 'zoom-punch') {
      const strength = (eff.params.strength ?? 22) / 100;
      const rate = eff.params.rate ?? 2;
      const pulse = Math.pow(Math.max(0, Math.sin(timelineTime * rate * Math.PI)), 4);
      effectZoomMult *= 1 + pulse * strength;
    }
  }

  // Build CSS filter string from ColorAdjustments + Basic Effects
  const filterParts: string[] = [];
  const c = clip.color;
  const bright = 100 + c.brightness + c.exposure * 0.6;
  const cont = 100 + c.contrast;
  let sat = 100 + c.saturation;

  for (const eff of enabledEffects) {
    if (eff.effectId === 'blur') {
      filterParts.push(`blur(${((eff.params.radius ?? 8) * scaleRatioX).toFixed(1)}px)`);
    } else if (eff.effectId === 'bw-noir') {
      sat = 0;
      filterParts.push(`contrast(${100 + (eff.params.contrastBoost ?? 25)}%)`);
    } else if (eff.effectId === 'sepia-vintage') {
      filterParts.push(`sepia(${eff.params.amount ?? 75}%)`);
    }
  }

  if (bright !== 100) filterParts.push(`brightness(${Math.max(10, bright)}%)`);
  if (cont !== 100) filterParts.push(`contrast(${Math.max(20, cont)}%)`);
  if (sat !== 100) filterParts.push(`saturate(${Math.max(0, sat)}%)`);
  if (c.temperature !== 0) {
    filterParts.push(`hue-rotate(${(c.temperature * -0.25).toFixed(1)}deg)`);
  }

  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, (anim.opacity / 100) * transAlphaMult));

  // Apply crop clipping box if any crop is active
  if (anim.cropTop > 0 || anim.cropBottom > 0 || anim.cropLeft > 0 || anim.cropRight > 0) {
    const cx = (anim.cropLeft / 100) * w;
    const cy = (anim.cropTop / 100) * h;
    const cw = w * (1 - (anim.cropLeft + anim.cropRight) / 100);
    const ch = h * (1 - (anim.cropTop + anim.cropBottom) / 100);
    ctx.beginPath();
    ctx.rect(cx, cy, Math.max(1, cw), Math.max(1, ch));
    ctx.clip();
  }

  // Apply 2D Transform around canvas center
  const centerX = w / 2 + anim.positionX * scaleRatioX + transOffsetX + shakeX;
  const centerY = h / 2 + anim.positionY * scaleRatioY + transOffsetY + shakeY;
  const totalScale = (anim.scale / 100) * transScaleMult * effectZoomMult;
  const totalRotRad = ((anim.rotation + transRotation) * Math.PI) / 180;

  ctx.translate(centerX, centerY);
  ctx.rotate(totalRotRad);
  ctx.scale(
    totalScale * (clip.transform.flipH ? -1 : 1),
    totalScale * (clip.transform.flipV ? -1 : 1)
  );
  ctx.translate(-w / 2, -h / 2);

  // Draw clip content according to type
  if (clip.type === 'video' || (clip.type === 'overlay' && clip.assetId)) {
    const asset = project.assets.find((a) => a.id === clip.assetId);
    if (asset) {
      drawClipMediaSource(ctx, clip, asset, timelineTime, w, h, mediaCache);
    }
  } else if (clip.type === 'overlay' && clip.stickerIcon) {
    drawStickerOverlay(ctx, clip, w, h);
  } else if (clip.type === 'text' && clip.textConfig) {
    drawCaptionOrTextLayer(ctx, clip, localTime, w, h, scaleRatioY);
  }

  // Apply post-transform layer effects (Chromatic Aberration, Glitch, VHS, Vignette, Letterbox, Teal-Orange, Light Leak, Film Grain)
  ctx.filter = 'none';
  for (const eff of enabledEffects) {
    switch (eff.effectId) {
      case 'chromatic-aberration': {
        const offset = (eff.params.offset ?? 6) * scaleRatioX;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 0, 85, 0.14)';
        ctx.fillRect(-offset, 0, w, h);
        ctx.fillStyle = 'rgba(0, 225, 255, 0.14)';
        ctx.fillRect(offset, 0, w, h);
        ctx.restore();
        break;
      }
      case 'teal-orange-grade': {
        const mix = (eff.params.intensity ?? 75) / 100;
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, `rgba(14, 165, 233, ${(0.22 * mix).toFixed(2)})`);
        g.addColorStop(1, `rgba(249, 115, 22, ${(0.25 * mix).toFixed(2)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        break;
      }
      case 'neon-glow':
      case 'halation-bloom': {
        const strength = (eff.params.intensity ?? 55) / 100;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const rad = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.65);
        rad.addColorStop(0, eff.effectId === 'neon-glow' ? `rgba(168, 85, 247, ${0.24 * strength})` : `rgba(251, 146, 60, ${0.22 * strength})`);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        break;
      }
      case 'vhs-retro': {
        const density = (eff.params.scanlines ?? 60) / 100;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${(0.28 * density).toFixed(2)})`;
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }
        ctx.restore();
        break;
      }
      case 'glitch-cyber': {
        const slices = eff.params.slices ?? 6;
        const sev = (eff.params.intensity ?? 45) / 100;
        ctx.save();
        for (let s = 0; s < slices; s++) {
          const seed = Math.sin((timelineTime * 24 + s) * 19.31);
          if (Math.abs(seed) > 1 - sev * 0.6) {
            const sy = ((s + 0.5) / slices) * h;
            const sh = h / (slices * 2.5);
            const shift = seed * 28 * scaleRatioX;
            ctx.fillStyle = s % 2 === 0 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(244, 63, 94, 0.28)';
            ctx.fillRect(shift, sy, w, sh);
          }
        }
        ctx.restore();
        break;
      }
      case 'light-leak': {
        const op = (eff.params.opacity ?? 40) / 100;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const leakGrad = ctx.createRadialGradient(
          w * (0.2 + 0.15 * Math.sin(timelineTime * 1.5)),
          h * 0.3,
          10,
          w * 0.2,
          h * 0.3,
          w * 0.65
        );
        leakGrad.addColorStop(0, `rgba(251, 113, 133, ${op * 0.75})`);
        leakGrad.addColorStop(0.5, `rgba(245, 158, 11, ${op * 0.45})`);
        leakGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leakGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        break;
      }
      case 'film-grain': {
        const amt = (eff.params.amount ?? 28) / 100;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${(amt * 0.08).toFixed(3)})`;
        for (let i = 0; i < 65; i++) {
          const gx = ((Math.sin(i * 78.233 + timelineTime * 60) + 1) * 0.5) * w;
          const gy = ((Math.cos(i * 45.164 + timelineTime * 60) + 1) * 0.5) * h;
          ctx.fillRect(gx, gy, 2, 2);
        }
        ctx.restore();
        break;
      }
      case 'impact-flash': {
        const speed = eff.params.speed ?? 4;
        const flashAmt = Math.max(0, Math.sin(timelineTime * speed * Math.PI * 2)) * ((eff.params.intensity ?? 70) / 100);
        if (flashAmt > 0.35) {
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${(flashAmt * 0.45).toFixed(2)})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        break;
      }
      case 'cinematic-letterbox': {
        const barPct = (eff.params.barHeight ?? 12) / 100;
        const barH = h * barPct;
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
        ctx.restore();
        break;
      }
    }
  }

  // Vignette (from color adjustments or vignette effect)
  const vigEffect = enabledEffects.find((e) => e.effectId === 'vignette');
  const vigAmount = Math.max(c.vignette, vigEffect ? (vigEffect.params.intensity ?? 55) : 0);
  if (vigAmount > 0) {
    ctx.save();
    const rad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, `rgba(0,0,0,${(vigAmount / 100) * 0.82})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Transition flash / dip overlay
  if (transFlashColor && transFlashAlpha > 0.01) {
    ctx.save();
    ctx.fillStyle = transFlashColor;
    ctx.globalAlpha = Math.min(1, transFlashAlpha);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  ctx.restore();
}

function drawClipMediaSource(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  asset: MediaAsset,
  timelineTime: number,
  w: number,
  h: number,
  mediaCache: MediaElementCache
) {
  const localTime = Math.max(0, timelineTime - clip.startTime);
  const rawSourceTime = clip.reverse
    ? Math.max(0, clip.sourceStart + (clip.duration - localTime) * clip.speed)
    : clip.sourceStart + localTime * clip.speed;

  if (asset.type === 'procedural-video') {
    drawProceduralVideoFrame(ctx, asset.proceduralPreset, rawSourceTime, w, h);
    return;
  }

  if (asset.type === 'image' && asset.url) {
    const img = mediaCache.images.get(asset.id);
    if (img && img.complete && img.naturalWidth > 0) {
      drawFittedElement(ctx, img, img.naturalWidth, img.naturalHeight, w, h, clip.transform.fitMode);
    }
    return;
  }

  if (asset.type === 'video' && asset.url) {
    const vid = mediaCache.videos.get(asset.id);
    if (vid && vid.readyState >= 2) {
      drawFittedElement(ctx, vid, vid.videoWidth || 1920, vid.videoHeight || 1080, w, h, clip.transform.fitMode);
    } else {
      drawProceduralVideoFrame(ctx, 'gta-chase', rawSourceTime, w, h);
    }
  }
}

function drawFittedElement(
  ctx: CanvasRenderingContext2D,
  el: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  fitMode: TimelineClip['transform']['fitMode']
) {
  const srcAspect = srcW / Math.max(1, srcH);
  const dstAspect = dstW / Math.max(1, dstH);

  let drawW = dstW;
  let drawH = dstH;

  if (fitMode === 'fill' || fitMode === 'crop') {
    if (srcAspect > dstAspect) {
      drawH = dstH;
      drawW = dstH * srcAspect;
    } else {
      drawW = dstW;
      drawH = dstW / srcAspect;
    }
  } else {
    // 'fit' or 'blur-bg'
    if (srcAspect > dstAspect) {
      drawW = dstW;
      drawH = dstW / srcAspect;
    } else {
      drawH = dstH;
      drawW = dstH * srcAspect;
    }
  }

  const dx = (dstW - drawW) / 2;
  const dy = (dstH - drawH) / 2;
  ctx.drawImage(el, dx, dy, drawW, drawH);
}

function drawCaptionOrTextLayer(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  localTime: number,
  w: number,
  h: number,
  scaleRatioY: number
) {
  const tc = clip.textConfig;
  if (!tc || !tc.text) return;

  ctx.save();
  const scaledFontSize = Math.max(14, Math.round(tc.fontSize * scaleRatioY));
  ctx.font = `${tc.fontWeight} ${scaledFontSize}px "${tc.fontFamily}", sans-serif`;
  ctx.textBaseline = 'middle';

  const centerX = w / 2;
  const centerY = h / 2;

  const words = tc.words && tc.words.length > 0 ? tc.words : [{ word: tc.text, startOffset: 0, endOffset: clip.duration }];
  const fullLine = words.map((wd) => wd.word).join(' ');
  const metrics = ctx.measureText(fullLine);
  const pad = tc.padding * scaleRatioY;
  const boxW = metrics.width + pad * 2.4;
  const boxH = scaledFontSize * 1.45 + pad;

  // Background plate if opacity > 0
  if (tc.backgroundOpacity > 0) {
    ctx.save();
    ctx.fillStyle = tc.backgroundColor || '#0B0D12';
    ctx.globalAlpha *= tc.backgroundOpacity / 100;
    ctx.beginPath();
    ctx.roundRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH, 10 * scaleRatioY);
    ctx.fill();
    ctx.restore();
  }

  // Word-by-word animated rendering for word-highlight & karaoke styles
  if (
    (tc.captionStyle === 'word-highlight' || tc.captionStyle === 'karaoke' || tc.captionStyle === 'animated-emphasis') &&
    words.length > 1
  ) {
    const spaceW = ctx.measureText(' ').width;
    let cursorX = centerX - metrics.width / 2;

    for (const wObj of words) {
      const wordW = ctx.measureText(wObj.word).width;
      const isActiveWord = localTime >= wObj.startOffset && localTime <= wObj.endOffset;
      const isPastWord = localTime > wObj.endOffset;

      ctx.save();
      if (isActiveWord) {
        // Highlight pill behind active spoken word
        ctx.fillStyle = tc.highlightColor || '#38BDF8';
        ctx.beginPath();
        ctx.roundRect(
          cursorX - 6 * scaleRatioY,
          centerY - scaledFontSize * 0.68,
          wordW + 12 * scaleRatioY,
          scaledFontSize * 1.36,
          6 * scaleRatioY
        );
        ctx.fill();
      }

      if (tc.strokeWidth > 0) {
        ctx.strokeStyle = tc.strokeColor || '#000000';
        ctx.lineWidth = tc.strokeWidth * scaleRatioY;
        ctx.lineJoin = 'round';
        ctx.strokeText(wObj.word, cursorX, centerY);
      }

      if (tc.captionStyle === 'karaoke') {
        ctx.fillStyle = isActiveWord || isPastWord ? tc.highlightColor : tc.color;
      } else {
        ctx.fillStyle = isActiveWord ? '#0B0D12' : tc.color;
      }
      ctx.fillText(wObj.word, cursorX, centerY);
      ctx.restore();

      cursorX += wordW + spaceW;
    }
  } else {
    // Standard single/multiline text rendering
    ctx.textAlign = tc.align || 'center';
    if (tc.shadowBlur > 0) {
      ctx.shadowColor = tc.shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = tc.shadowBlur * scaleRatioY;
    }
    if (tc.strokeWidth > 0) {
      ctx.strokeStyle = tc.strokeColor || '#000000';
      ctx.lineWidth = tc.strokeWidth * scaleRatioY;
      ctx.lineJoin = 'round';
      ctx.strokeText(tc.text, centerX, centerY);
    }
    ctx.fillStyle = tc.color || '#FFFFFF';
    ctx.fillText(tc.text, centerX, centerY);
  }

  ctx.restore();
}

function drawStickerOverlay(ctx: CanvasRenderingContext2D, clip: TimelineClip, w: number, h: number) {
  ctx.save();
  const badgeW = Math.min(w, h) * 0.24;
  const badgeH = badgeW * 0.42;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${Math.round(badgeH * 0.38)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${clip.stickerIcon || '⚡'} ${clip.name.replace('Overlay: ', '')}`, cx, cy);
  ctx.restore();
}

function drawSafeAreaGuides(ctx: CanvasRenderingContext2D, w: number, h: number, aspect: string) {
  ctx.save();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);

  // Action safe 90%
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  // Title safe 80%
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

  // Center crosshair
  ctx.beginPath();
  ctx.moveTo(w / 2 - 15, h / 2);
  ctx.lineTo(w / 2 + 15, h / 2);
  ctx.moveTo(w / 2, h / 2 - 15);
  ctx.lineTo(w / 2, h / 2 + 15);
  ctx.stroke();

  // If 9:16 vertical, highlight bottom social UI caption danger zone
  if (aspect === '9:16') {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText('REELS / TIKTOK UI OVERLAY ZONE', 16, h * 0.81);
  }

  ctx.restore();
}
