export type AnimationType =
  | 'bump'
  | 'rotate'
  | 'pulse'
  | 'shake'
  | 'bounce'
  | 'glow'
  | 'blur'
  | 'skew'
  | 'flip'
  | 'wave';

export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  animation: AnimationType;
  sensitivity: number; // 0-100, how sensitive to audio
  frequencyRange: 'bass' | 'mid' | 'treble' | 'all';
  intensity: number; // 0-100, max animation intensity
}

export interface AudioState {
  file: File | null;
  url: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface FrequencyData {
  bass: number;
  mid: number;
  treble: number;
  average: number;
  raw: Uint8Array;
}

export const ANIMATION_DESCRIPTIONS: Record<AnimationType, string> = {
  bump: 'Scale up and down',
  rotate: 'Rotate with intensity',
  pulse: 'Pulsing glow effect',
  shake: 'Horizontal shake',
  bounce: 'Vertical bounce',
  glow: 'Glowing shadow',
  blur: 'Blur in/out',
  skew: 'Skew transformation',
  flip: '3D flip effect',
  wave: 'Wave distortion'
};

export const FREQUENCY_RANGES = {
  bass: { start: 0, end: 10 },
  mid: { start: 10, end: 100 },
  treble: { start: 100, end: 256 },
  all: { start: 0, end: 256 }
};
