import { useRef, useCallback, useState, useEffect } from 'react';
import type { FrequencyData } from '../types';
import { FREQUENCY_RANGES } from '../types';

interface UseAudioAnalyzerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  frequencyData: FrequencyData;
  isInitialized: boolean;
  initializeAnalyzer: () => void;
}

export function useAudioAnalyzer(): UseAudioAnalyzerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [frequencyData, setFrequencyData] = useState<FrequencyData>({
    bass: 0,
    mid: 0,
    treble: 0,
    average: 0,
    raw: new Uint8Array(256)
  });

  const getFrequencyValue = useCallback((dataArray: Uint8Array, range: { start: number; end: number }) => {
    let sum = 0;
    const count = range.end - range.start;
    for (let i = range.start; i < range.end && i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return count > 0 ? sum / count / 255 : 0;
  }, []);

  const analyze = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    const bass = getFrequencyValue(dataArray, FREQUENCY_RANGES.bass);
    const mid = getFrequencyValue(dataArray, FREQUENCY_RANGES.mid);
    const treble = getFrequencyValue(dataArray, FREQUENCY_RANGES.treble);
    const average = (bass + mid + treble) / 3;

    setFrequencyData({
      bass,
      mid,
      treble,
      average,
      raw: dataArray
    });

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [getFrequencyValue]);

  const initializeAnalyzer = useCallback(() => {
    if (!audioRef.current || isInitialized) return;

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.8;
      analyzerRef.current = analyzer;

      // Connect audio element to analyzer
      const source = audioContext.createMediaElementSource(audioRef.current);
      sourceRef.current = source;
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      setIsInitialized(true);

      // Start analysis loop
      analyze();
    } catch (error) {
      console.error('Error initializing audio analyzer:', error);
    }
  }, [isInitialized, analyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    audioRef,
    frequencyData,
    isInitialized,
    initializeAnalyzer
  };
}
