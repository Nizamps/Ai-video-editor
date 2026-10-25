import { ColorAdjustments, EffectDefinition } from '../types/editor';

export const EFFECTS_REGISTRY: EffectDefinition[] = [
  // Basic Effects
  {
    id: 'blur',
    name: 'Gaussian Blur',
    category: 'basic',
    description: 'Smooth optical defocus across the clip layer',
    badgeColor: '#3B82F6',
    parameters: [
      { key: 'radius', label: 'Blur Radius', min: 0, max: 40, step: 1, defaultValue: 8, unit: 'px' },
    ],
  },
  {
    id: 'chromatic-aberration',
    name: 'Chromatic Aberration (RGB Split)',
    category: 'basic',
    description: 'Lateral red/cyan channel displacement for optical prism edge fringing',
    badgeColor: '#EC4899',
    parameters: [
      { key: 'offset', label: 'Channel Offset', min: 1, max: 30, step: 1, defaultValue: 7, unit: 'px' },
      { key: 'angle', label: 'Split Angle', min: 0, max: 360, step: 5, defaultValue: 0, unit: '°' },
    ],
  },
  {
    id: 'vignette',
    name: 'Anamorphic Vignette',
    category: 'basic',
    description: 'Darkens frame corners to draw focus toward center subject',
    badgeColor: '#6366F1',
    parameters: [
      { key: 'intensity', label: 'Darkness', min: 10, max: 100, step: 5, defaultValue: 55, unit: '%' },
      { key: 'feather', label: 'Feather Softness', min: 10, max: 100, step: 5, defaultValue: 65, unit: '%' },
    ],
  },
  {
    id: 'bw-noir',
    name: 'High-Contrast Monochrome',
    category: 'basic',
    description: 'Silver-halide black and white conversion with punchy contrast',
    badgeColor: '#94A3B8',
    parameters: [
      { key: 'contrastBoost', label: 'Contrast Boost', min: 0, max: 80, step: 5, defaultValue: 25, unit: '%' },
    ],
  },
  {
    id: 'sepia-vintage',
    name: 'Warm Sepia Tone',
    category: 'basic',
    description: 'Archival warm amber monochrome toning',
    badgeColor: '#D97706',
    parameters: [
      { key: 'amount', label: 'Sepia Intensity', min: 10, max: 100, step: 5, defaultValue: 75, unit: '%' },
    ],
  },
  {
    id: 'neon-glow',
    name: 'Neon Edge Glow',
    category: 'basic',
    description: 'Luminous halation bloom around bright highlights',
    badgeColor: '#A855F7',
    parameters: [
      { key: 'intensity', label: 'Glow Strength', min: 10, max: 100, step: 5, defaultValue: 60, unit: '%' },
      { key: 'radius', label: 'Bloom Spread', min: 4, max: 40, step: 2, defaultValue: 18, unit: 'px' },
    ],
  },

  // Gaming & Social Media Effects
  {
    id: 'camera-shake',
    name: 'Action Camera Shake',
    category: 'gaming',
    description: 'Procedural handheld impact trauma & kinetic vibration',
    badgeColor: '#F43F5E',
    parameters: [
      { key: 'amplitude', label: 'Shake Amplitude', min: 2, max: 50, step: 2, defaultValue: 14, unit: 'px' },
      { key: 'frequency', label: 'Frequency', min: 2, max: 30, step: 1, defaultValue: 12, unit: 'Hz' },
    ],
  },
  {
    id: 'zoom-punch',
    name: 'Beat Zoom Punch',
    category: 'gaming',
    description: 'Rhythmic focal pulse synchronized to clip cadence',
    badgeColor: '#8B5CF6',
    parameters: [
      { key: 'strength', label: 'Zoom Strength', min: 5, max: 60, step: 5, defaultValue: 22, unit: '%' },
      { key: 'rate', label: 'Pulse Rate', min: 0.5, max: 6, step: 0.5, defaultValue: 2, unit: 'Hz' },
    ],
  },
  {
    id: 'glitch-cyber',
    name: 'Digital Glitch Slice',
    category: 'gaming',
    description: 'Horizontal scanline tearing with RGB data moshing',
    badgeColor: '#10B981',
    parameters: [
      { key: 'intensity', label: 'Glitch Severity', min: 10, max: 100, step: 5, defaultValue: 45, unit: '%' },
      { key: 'slices', label: 'Slice Count', min: 2, max: 16, step: 1, defaultValue: 6 },
    ],
  },
  {
    id: 'vhs-retro',
    name: 'VHS Tape Deck 1994',
    category: 'gaming',
    description: 'CRT scanlines, tracking jitter, and color bleed',
    badgeColor: '#F59E0B',
    parameters: [
      { key: 'scanlines', label: 'Scanline Density', min: 10, max: 100, step: 5, defaultValue: 60, unit: '%' },
      { key: 'noise', label: 'Tape Tracking Noise', min: 0, max: 100, step: 5, defaultValue: 35, unit: '%' },
    ],
  },
  {
    id: 'impact-flash',
    name: 'Strobe Impact Flash',
    category: 'gaming',
    description: 'High-energy exposure flash on cut entry or beat',
    badgeColor: '#38BDF8',
    parameters: [
      { key: 'intensity', label: 'Flash Brightness', min: 10, max: 100, step: 5, defaultValue: 70, unit: '%' },
      { key: 'speed', label: 'Strobe Decay', min: 1, max: 10, step: 1, defaultValue: 4 },
    ],
  },
  {
    id: 'radial-focus',
    name: 'Speed Tunnel Focus',
    category: 'gaming',
    description: 'Peripheral motion streaks emphasizing central crosshair action',
    badgeColor: '#EC4899',
    parameters: [
      { key: 'strength', label: 'Tunnel Intensity', min: 10, max: 100, step: 5, defaultValue: 50, unit: '%' },
    ],
  },

  // Cinematic Effects
  {
    id: 'cinematic-letterbox',
    name: '2.39:1 Anamorphic Letterbox',
    category: 'cinematic',
    description: 'Widescreen cinema matte bars with configurable ratio',
    badgeColor: '#6366F1',
    parameters: [
      { key: 'barHeight', label: 'Matte Bar Height', min: 4, max: 24, step: 1, defaultValue: 12, unit: '%' },
    ],
  },
  {
    id: 'film-grain',
    name: '35mm Kodak Film Grain',
    category: 'cinematic',
    description: 'Organic celluloid grain texture across midtones',
    badgeColor: '#EAB308',
    parameters: [
      { key: 'amount', label: 'Grain Weight', min: 5, max: 80, step: 5, defaultValue: 28, unit: '%' },
    ],
  },
  {
    id: 'halation-bloom',
    name: 'Cinema Halation & Bloom',
    category: 'cinematic',
    description: 'Warm tungsten highlight roll-off and atmospheric diffusion',
    badgeColor: '#F97316',
    parameters: [
      { key: 'intensity', label: 'Bloom Amount', min: 10, max: 100, step: 5, defaultValue: 45, unit: '%' },
    ],
  },
  {
    id: 'light-leak',
    name: 'Anamorphic Light Leak',
    category: 'cinematic',
    description: 'Warm amber and magenta optical lens flare wash',
    badgeColor: '#FB7185',
    parameters: [
      { key: 'opacity', label: 'Flare Opacity', min: 10, max: 90, step: 5, defaultValue: 40, unit: '%' },
      { key: 'warmth', label: 'Color Shift', min: 0, max: 100, step: 5, defaultValue: 65, unit: '%' },
    ],
  },
  {
    id: 'teal-orange-grade',
    name: 'Blockbuster Teal & Orange',
    category: 'cinematic',
    description: 'Complementary cyan shadow split-tone with warm skin highlights',
    badgeColor: '#14B8A6',
    parameters: [
      { key: 'intensity', label: 'Grade Mix', min: 10, max: 100, step: 5, defaultValue: 75, unit: '%' },
    ],
  },
];

export interface ColorGradePreset {
  id: string;
  name: string;
  category: string;
  color: Partial<ColorAdjustments>;
}

export const COLOR_GRADE_PRESETS: ColorGradePreset[] = [
  {
    id: 'cinematic-teal-orange',
    name: 'Teal & Amber Blockbuster',
    category: 'Cinematic',
    color: { contrast: 24, saturation: 14, temperature: -16, tint: 8, shadows: -12, highlights: 15, vignette: 30 },
  },
  {
    id: 'vice-miami-sunset',
    name: 'Vice Neon Dusk',
    category: 'Gaming',
    color: { brightness: 6, contrast: 28, saturation: 35, temperature: 22, tint: 26, highlights: 18, vignette: 20 },
  },
  {
    id: 'moody-cyber-slate',
    name: 'Cyberpunk Slate',
    category: 'Sci-Fi',
    color: { brightness: -6, contrast: 32, saturation: -12, temperature: -28, tint: -10, shadows: -18, vignette: 45 },
  },
  {
    id: 'kodak-2383-warm',
    name: 'Kodak 2383 Print',
    category: 'Film',
    color: { brightness: 4, contrast: 18, saturation: 10, temperature: 18, shadows: -8, highlights: -6, vignette: 22 },
  },
  {
    id: 'bleach-bypass',
    name: 'Gritty Bleach Bypass',
    category: 'Action',
    color: { brightness: -4, contrast: 42, saturation: -48, exposure: 5, sharpen: 35, vignette: 40 },
  },
  {
    id: 'clean-broadcast',
    name: 'Crisp Studio Rec.709',
    category: 'Clean',
    color: { brightness: 4, contrast: 12, saturation: 12, exposure: 4, sharpen: 20, vignette: 0 },
  },
];
