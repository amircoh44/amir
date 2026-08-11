import type { ImageItem, AnimationType } from '../types';
import { ANIMATION_DESCRIPTIONS } from '../types';

interface ImageCardProps {
  image: ImageItem;
  onUpdate: (id: string, updates: Partial<ImageItem>) => void;
  onRemove: (id: string) => void;
}

const ANIMATION_OPTIONS: AnimationType[] = [
  'bump', 'rotate', 'pulse', 'shake', 'bounce',
  'glow', 'blur', 'skew', 'flip', 'wave'
];

const FREQUENCY_OPTIONS = [
  { value: 'bass', label: 'Bass (Low)' },
  { value: 'mid', label: 'Mid' },
  { value: 'treble', label: 'Treble (High)' },
  { value: 'all', label: 'All Frequencies' }
] as const;

export function ImageCard({ image, onUpdate, onRemove }: ImageCardProps) {
  return (
    <div className="image-card">
      <div className="image-preview">
        <img src={image.url} alt={image.name} />
        <button
          className="remove-btn"
          onClick={() => onRemove(image.id)}
          title="Remove image"
        >
          ✕
        </button>
      </div>

      <div className="image-controls">
        <p className="image-name" title={image.name}>{image.name}</p>

        <div className="control-group">
          <label>Animation</label>
          <select
            value={image.animation}
            onChange={(e) => onUpdate(image.id, { animation: e.target.value as AnimationType })}
          >
            {ANIMATION_OPTIONS.map(anim => (
              <option key={anim} value={anim}>
                {anim.charAt(0).toUpperCase() + anim.slice(1)} - {ANIMATION_DESCRIPTIONS[anim]}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Frequency Range</label>
          <select
            value={image.frequencyRange}
            onChange={(e) => onUpdate(image.id, { frequencyRange: e.target.value as ImageItem['frequencyRange'] })}
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Sensitivity: {image.sensitivity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={image.sensitivity}
            onChange={(e) => onUpdate(image.id, { sensitivity: Number(e.target.value) })}
          />
        </div>

        <div className="control-group">
          <label>Intensity: {image.intensity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={image.intensity}
            onChange={(e) => onUpdate(image.id, { intensity: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
