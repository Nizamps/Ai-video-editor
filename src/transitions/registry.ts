import { TransitionDefinition } from '../types/editor';

export const TRANSITIONS_REGISTRY: TransitionDefinition[] = [
  // Basic Transitions
  {
    id: 'cut',
    name: 'Hard Cut',
    category: 'basic',
    description: 'Instantaneous frame-accurate cut between clips',
    defaultDuration: 0.0,
  },
  {
    id: 'cross-dissolve',
    name: 'Cross Dissolve',
    category: 'basic',
    description: 'Smooth opacity blend across adjacent clips',
    defaultDuration: 0.6,
  },
  {
    id: 'fade-black',
    name: 'Dip to Black',
    category: 'basic',
    description: 'Fades through deep cinema black into the incoming shot',
    defaultDuration: 0.8,
  },
  {
    id: 'fade-white',
    name: 'Flash through White',
    category: 'basic',
    description: 'High-energy luminous white exposure transition',
    defaultDuration: 0.45,
  },

  // Motion Transitions
  {
    id: 'zoom-in-trans',
    name: 'Hyper Zoom In',
    category: 'motion',
    description: 'Rapid scale acceleration into incoming clip',
    defaultDuration: 0.4,
  },
  {
    id: 'zoom-out-trans',
    name: 'Hyper Zoom Out',
    category: 'motion',
    description: 'Pulls back rapidly with motion blur easing',
    defaultDuration: 0.4,
  },
  {
    id: 'whip-left',
    name: 'Whip Pan Left',
    category: 'motion',
    description: 'Fast horizontal camera whip slide to the left',
    defaultDuration: 0.35,
  },
  {
    id: 'whip-right',
    name: 'Whip Pan Right',
    category: 'motion',
    description: 'Fast horizontal camera whip slide to the right',
    defaultDuration: 0.35,
  },
  {
    id: 'push-up',
    name: 'Vertical Reel Push Up',
    category: 'motion',
    description: 'Energetic vertical swipe ideal for 9:16 Shorts',
    defaultDuration: 0.4,
  },
  {
    id: 'spin-whirl',
    name: 'Spin Vortex',
    category: 'motion',
    description: 'Rotational whip transition between action cuts',
    defaultDuration: 0.5,
  },

  // Stylized Transitions
  {
    id: 'glitch-cut',
    name: 'Cyber Glitch Transition',
    category: 'stylized',
    description: 'RGB channel tear and digital block displacement on cut',
    defaultDuration: 0.35,
  },
  {
    id: 'flash-impact',
    name: 'Impact Strobe Cut',
    category: 'stylized',
    description: 'Overexposed lens flare burst masking the edit point',
    defaultDuration: 0.3,
  },
  {
    id: 'rgb-prism',
    name: 'Chromatic Prism Wipe',
    category: 'stylized',
    description: 'Splits RGB color planes across the transition boundary',
    defaultDuration: 0.5,
  },
  {
    id: 'light-leak-burn',
    name: 'Film Burn Wash',
    category: 'stylized',
    description: 'Organic celluloid amber flash over the cut point',
    defaultDuration: 0.65,
  },
];
