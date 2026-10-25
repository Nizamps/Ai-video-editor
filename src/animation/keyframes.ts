import { AnimatableProperty, EasingType, Keyframe, TimelineClip } from '../types/editor';

export interface AnimationPreset {
  id: string;
  name: string;
  category: 'entrance' | 'emphasis' | 'camera' | 'text';
  description: string;
  createKeyframes: (clipDuration: number) => Omit<Keyframe, 'id'>[];
}

/**
 * Evaluates normalized progress t in [0, 1] using the specified easing curve.
 */
export function evaluateEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'ease-in':
      return clamped * clamped * clamped;
    case 'ease-out':
      return 1 - Math.pow(1 - clamped, 3);
    case 'ease-in-out':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'hold':
      return clamped < 1 ? 0 : 1;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = clamped;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
      } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
      } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
      }
    }
    default:
      return clamped;
  }
}

/**
 * Computes the interpolated value of an animatable property at `localTime` (seconds from clip start).
 * Falls back to `baseValue` when no keyframes exist for that property.
 */
export function interpolateProperty(
  keyframes: Keyframe[],
  property: AnimatableProperty,
  localTime: number,
  baseValue: number
): number {
  const propKfs = keyframes
    .filter((k) => k.property === property)
    .sort((a, b) => a.timeOffset - b.timeOffset);

  if (propKfs.length === 0) return baseValue;
  if (propKfs.length === 1) return propKfs[0].value;

  if (localTime <= propKfs[0].timeOffset) {
    return propKfs[0].value;
  }
  const last = propKfs[propKfs.length - 1];
  if (localTime >= last.timeOffset) {
    return last.value;
  }

  for (let i = 0; i < propKfs.length - 1; i++) {
    const startKf = propKfs[i];
    const endKf = propKfs[i + 1];
    if (localTime >= startKf.timeOffset && localTime <= endKf.timeOffset) {
      const span = endKf.timeOffset - startKf.timeOffset;
      if (span <= 0.0001) return endKf.value;
      const rawT = (localTime - startKf.timeOffset) / span;
      const easedT = evaluateEasing(rawT, endKf.easing || startKf.easing);
      return startKf.value + (endKf.value - startKf.value) * easedT;
    }
  }

  return baseValue;
}

/**
 * Resolves all animated transform + volume values for a clip at a given timeline playhead time.
 */
export function getAnimatedClipValues(clip: TimelineClip, timelineTime: number) {
  const localTime = Math.max(0, Math.min(clip.duration, timelineTime - clip.startTime));
  const kfs = clip.keyframes || [];

  let opacity = interpolateProperty(kfs, 'opacity', localTime, clip.transform.opacity);
  if (clip.fadeIn > 0 && localTime < clip.fadeIn) {
    opacity *= localTime / clip.fadeIn;
  }
  if (clip.fadeOut > 0 && localTime > clip.duration - clip.fadeOut) {
    const rem = Math.max(0, clip.duration - localTime);
    opacity *= rem / clip.fadeOut;
  }

  return {
    localTime,
    positionX: interpolateProperty(kfs, 'positionX', localTime, clip.transform.positionX),
    positionY: interpolateProperty(kfs, 'positionY', localTime, clip.transform.positionY),
    scale: interpolateProperty(kfs, 'scale', localTime, clip.transform.scale),
    rotation: interpolateProperty(kfs, 'rotation', localTime, clip.transform.rotation),
    opacity: Math.max(0, Math.min(100, opacity)),
    volume: interpolateProperty(kfs, 'volume', localTime, clip.volume),
    cropTop: interpolateProperty(kfs, 'cropTop', localTime, clip.transform.cropTop),
    cropBottom: interpolateProperty(kfs, 'cropBottom', localTime, clip.transform.cropBottom),
    cropLeft: interpolateProperty(kfs, 'cropLeft', localTime, clip.transform.cropLeft),
    cropRight: interpolateProperty(kfs, 'cropRight', localTime, clip.transform.cropRight),
  };
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'fade-in-out',
    name: 'Fade In & Out',
    category: 'entrance',
    description: 'Smooth opacity fade at clip start and end',
    createKeyframes: (d) => [
      { property: 'opacity', timeOffset: 0, value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: Math.min(0.6, d * 0.25), value: 100, easing: 'ease-out' },
      { property: 'opacity', timeOffset: Math.max(0.7, d - Math.min(0.6, d * 0.25)), value: 100, easing: 'linear' },
      { property: 'opacity', timeOffset: d, value: 0, easing: 'ease-in' },
    ],
  },
  {
    id: 'zoom-punch-in',
    name: 'Zoom Punch In',
    category: 'emphasis',
    description: 'Rapid energetic scale punch for action moments',
    createKeyframes: (d) => [
      { property: 'scale', timeOffset: 0, value: 100, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(0.35, d * 0.3), value: 128, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(1.2, d * 0.8), value: 115, easing: 'ease-in-out' },
    ],
  },
  {
    id: 'zoom-out-reveal',
    name: 'Zoom Out Reveal',
    category: 'entrance',
    description: 'Starts tight at 140% and settles smoothly to 100%',
    createKeyframes: (d) => [
      { property: 'scale', timeOffset: 0, value: 140, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(0.8, d * 0.4), value: 100, easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-in-left',
    name: 'Slide In Left',
    category: 'entrance',
    description: 'Whip entrance from the left frame edge',
    createKeyframes: (d) => [
      { property: 'positionX', timeOffset: 0, value: -420, easing: 'ease-out' },
      { property: 'positionX', timeOffset: Math.min(0.45, d * 0.3), value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: 0, value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: Math.min(0.3, d * 0.2), value: 100, easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-in-right',
    name: 'Slide In Right',
    category: 'entrance',
    description: 'Whip entrance from the right frame edge',
    createKeyframes: (d) => [
      { property: 'positionX', timeOffset: 0, value: 420, easing: 'ease-out' },
      { property: 'positionX', timeOffset: Math.min(0.45, d * 0.3), value: 0, easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-in-bottom',
    name: 'Slide Up Rise',
    category: 'entrance',
    description: 'Rises cleanly from bottom with easing',
    createKeyframes: (d) => [
      { property: 'positionY', timeOffset: 0, value: 260, easing: 'ease-out' },
      { property: 'positionY', timeOffset: Math.min(0.45, d * 0.3), value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: 0, value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: Math.min(0.3, d * 0.2), value: 100, easing: 'ease-out' },
    ],
  },
  {
    id: 'pop-in',
    name: 'Pop In Elastic',
    category: 'entrance',
    description: 'Overshoots scale and settles for captions & stickers',
    createKeyframes: (d) => [
      { property: 'scale', timeOffset: 0, value: 30, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(0.22, d * 0.2), value: 114, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(0.38, d * 0.35), value: 100, easing: 'ease-in-out' },
    ],
  },
  {
    id: 'bounce-drop',
    name: 'Bounce Drop',
    category: 'entrance',
    description: 'Physics bounce entrance from top',
    createKeyframes: (d) => [
      { property: 'positionY', timeOffset: 0, value: -300, easing: 'bounce' },
      { property: 'positionY', timeOffset: Math.min(0.75, d * 0.45), value: 0, easing: 'bounce' },
    ],
  },
  {
    id: 'gaming-impact',
    name: 'Gaming Impact Shake',
    category: 'emphasis',
    description: 'High-impact scale burst + rotational jolt for montages',
    createKeyframes: (d) => {
      const t1 = Math.min(0.12, d * 0.1);
      const t2 = Math.min(0.24, d * 0.2);
      const t3 = Math.min(0.38, d * 0.3);
      return [
        { property: 'scale', timeOffset: 0, value: 100, easing: 'ease-out' },
        { property: 'scale', timeOffset: t1, value: 132, easing: 'ease-out' },
        { property: 'scale', timeOffset: t3, value: 104, easing: 'ease-in-out' },
        { property: 'rotation', timeOffset: 0, value: 0, easing: 'ease-out' },
        { property: 'rotation', timeOffset: t1, value: -4, easing: 'ease-out' },
        { property: 'rotation', timeOffset: t2, value: 3, easing: 'ease-in-out' },
        { property: 'rotation', timeOffset: t3, value: 0, easing: 'ease-out' },
      ];
    },
  },
  {
    id: 'ken-burns',
    name: 'Ken Burns Pan & Zoom',
    category: 'camera',
    description: 'Continuous documentary slow push-in and subtle pan',
    createKeyframes: (d) => [
      { property: 'scale', timeOffset: 0, value: 100, easing: 'linear' },
      { property: 'scale', timeOffset: d, value: 122, easing: 'linear' },
      { property: 'positionX', timeOffset: 0, value: -24, easing: 'linear' },
      { property: 'positionX', timeOffset: d, value: 24, easing: 'linear' },
    ],
  },
  {
    id: 'cinematic-entrance',
    name: 'Cinematic Slow Rise',
    category: 'camera',
    description: 'Subtle vertical drift with smooth fade-in',
    createKeyframes: (d) => [
      { property: 'opacity', timeOffset: 0, value: 0, easing: 'ease-out' },
      { property: 'opacity', timeOffset: Math.min(1.0, d * 0.35), value: 100, easing: 'ease-out' },
      { property: 'scale', timeOffset: 0, value: 108, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(1.5, d * 0.6), value: 100, easing: 'ease-out' },
    ],
  },
  {
    id: 'spin-reveal',
    name: 'Spin In 360°',
    category: 'emphasis',
    description: 'Full 360 degree rotation with scale-up',
    createKeyframes: (d) => [
      { property: 'rotation', timeOffset: 0, value: -360, easing: 'ease-out' },
      { property: 'rotation', timeOffset: Math.min(0.6, d * 0.4), value: 0, easing: 'ease-out' },
      { property: 'scale', timeOffset: 0, value: 20, easing: 'ease-out' },
      { property: 'scale', timeOffset: Math.min(0.6, d * 0.4), value: 100, easing: 'ease-out' },
    ],
  },
];
