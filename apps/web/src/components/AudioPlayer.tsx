import { useEffect, useCallback } from 'react';
import type { AudioState, FrequencyData } from '../types';

interface AudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioState: AudioState;
  frequencyData: FrequencyData;
  isInitialized: boolean;
  onAudioStateChange: (updates: Partial<AudioState>) => void;
  onInitialize: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  audioRef,
  audioState,
  frequencyData,
  isInitialized,
  onAudioStateChange,
  onInitialize
}: AudioPlayerProps) {
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (!isInitialized) {
      onInitialize();
    }

    if (audioState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [audioRef, audioState.isPlaying, isInitialized, onInitialize]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    onAudioStateChange({ currentTime: time });
  }, [audioRef, onAudioStateChange]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onAudioStateChange({ currentTime: audio.currentTime });
    };

    const handleLoadedMetadata = () => {
      onAudioStateChange({ duration: audio.duration });
    };

    const handlePlay = () => {
      onAudioStateChange({ isPlaying: true });
    };

    const handlePause = () => {
      onAudioStateChange({ isPlaying: false });
    };

    const handleEnded = () => {
      onAudioStateChange({ isPlaying: false, currentTime: 0 });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, onAudioStateChange]);

  if (!audioState.url) {
    return null;
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={audioState.url} crossOrigin="anonymous" />

      <div className="player-controls">
        <button
          className="play-btn"
          onClick={handlePlayPause}
          title={audioState.isPlaying ? 'Pause' : 'Play'}
        >
          {audioState.isPlaying ? '⏸️' : '▶️'}
        </button>

        <div className="time-display">
          {formatTime(audioState.currentTime)} / {formatTime(audioState.duration || 0)}
        </div>

        <input
          type="range"
          className="seek-bar"
          min="0"
          max={audioState.duration || 0}
          value={audioState.currentTime}
          onChange={handleSeek}
        />
      </div>

      <div className="frequency-display">
        <div className="freq-bar bass" style={{ height: `${frequencyData.bass * 100}%` }}>
          <span>Bass</span>
        </div>
        <div className="freq-bar mid" style={{ height: `${frequencyData.mid * 100}%` }}>
          <span>Mid</span>
        </div>
        <div className="freq-bar treble" style={{ height: `${frequencyData.treble * 100}%` }}>
          <span>Treble</span>
        </div>
      </div>
    </div>
  );
}
