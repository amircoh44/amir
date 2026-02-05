import { useMemo } from 'react';
import type { ImageItem, FrequencyData } from '../types';

interface VisualizerProps {
  images: ImageItem[];
  frequencyData: FrequencyData;
  isPlaying: boolean;
}

function getAnimationStyle(
  image: ImageItem,
  frequencyData: FrequencyData
): React.CSSProperties {
  // Get the frequency value based on the selected range
  let frequencyValue: number;
  switch (image.frequencyRange) {
    case 'bass':
      frequencyValue = frequencyData.bass;
      break;
    case 'mid':
      frequencyValue = frequencyData.mid;
      break;
    case 'treble':
      frequencyValue = frequencyData.treble;
      break;
    default:
      frequencyValue = frequencyData.average;
  }

  // Apply sensitivity and intensity
  const sensitivityMultiplier = image.sensitivity / 50; // 0-2 range
  const intensityMultiplier = image.intensity / 100;
  const value = frequencyValue * sensitivityMultiplier * intensityMultiplier;

  // Base styles
  const baseStyle: React.CSSProperties = {
    transition: 'transform 0.05s ease-out, filter 0.05s ease-out, box-shadow 0.05s ease-out',
  };

  // Apply animation based on type
  switch (image.animation) {
    case 'bump':
      return {
        ...baseStyle,
        transform: `scale(${1 + value * 0.5})`,
      };

    case 'rotate':
      return {
        ...baseStyle,
        transform: `rotate(${value * 45}deg)`,
      };

    case 'pulse':
      return {
        ...baseStyle,
        transform: `scale(${1 + value * 0.3})`,
        boxShadow: `0 0 ${value * 50}px ${value * 20}px rgba(138, 43, 226, ${value * 0.8})`,
      };

    case 'shake':
      const shakeX = (Math.random() - 0.5) * value * 30;
      return {
        ...baseStyle,
        transform: `translateX(${shakeX}px)`,
      };

    case 'bounce':
      return {
        ...baseStyle,
        transform: `translateY(${-value * 50}px)`,
      };

    case 'glow':
      return {
        ...baseStyle,
        boxShadow: `0 0 ${value * 60}px ${value * 30}px rgba(255, 215, 0, ${value})`,
        filter: `brightness(${1 + value * 0.5})`,
      };

    case 'blur':
      return {
        ...baseStyle,
        filter: `blur(${(1 - value) * 5}px)`,
        transform: `scale(${1 + value * 0.2})`,
      };

    case 'skew':
      return {
        ...baseStyle,
        transform: `skewX(${value * 20}deg) skewY(${value * 10}deg)`,
      };

    case 'flip':
      return {
        ...baseStyle,
        transform: `perspective(500px) rotateY(${value * 180}deg)`,
      };

    case 'wave':
      return {
        ...baseStyle,
        transform: `translateY(${Math.sin(Date.now() / 100) * value * 20}px) scaleX(${1 + value * 0.2})`,
      };

    default:
      return baseStyle;
  }
}

export function Visualizer({ images, frequencyData, isPlaying }: VisualizerProps) {
  const gridStyle = useMemo(() => {
    const count = images.length;
    if (count <= 1) return { gridTemplateColumns: '1fr' };
    if (count <= 2) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    if (count <= 4) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    if (count <= 6) return { gridTemplateColumns: 'repeat(3, 1fr)' };
    if (count <= 9) return { gridTemplateColumns: 'repeat(3, 1fr)' };
    return { gridTemplateColumns: 'repeat(4, 1fr)' };
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="visualizer-empty">
        <div className="empty-content">
          <span className="empty-icon">🎬</span>
          <h3>No Images Yet</h3>
          <p>Upload some HD images to get started with your visualizer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualizer" style={gridStyle}>
      {images.map((image) => (
        <div key={image.id} className="visualizer-item">
          <img
            src={image.url}
            alt={image.name}
            style={isPlaying ? getAnimationStyle(image, frequencyData) : {}}
            className="visualizer-image"
          />
          <div className="image-label">{image.name}</div>
        </div>
      ))}
    </div>
  );
}
