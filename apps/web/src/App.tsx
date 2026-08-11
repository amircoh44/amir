import { useState, useCallback } from 'react';
import type { ImageItem, AudioState } from './types';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { ImageUpload } from './components/ImageUpload';
import { AudioUpload } from './components/AudioUpload';
import { ImageCard } from './components/ImageCard';
import { Visualizer } from './components/Visualizer';
import { AudioPlayer } from './components/AudioPlayer';
import './App.css';

function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [audioState, setAudioState] = useState<AudioState>({
    file: null,
    url: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0
  });
  const [showConfig, setShowConfig] = useState(true);

  const { audioRef, frequencyData, isInitialized, initializeAnalyzer } = useAudioAnalyzer();

  const handleImagesAdd = useCallback((newImages: ImageItem[]) => {
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const handleImageUpdate = useCallback((id: string, updates: Partial<ImageItem>) => {
    setImages(prev =>
      prev.map(img => (img.id === id ? { ...img, ...updates } : img))
    );
  }, []);

  const handleImageRemove = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.url);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleAudioChange = useCallback((file: File) => {
    // Revoke old URL if exists
    if (audioState.url) {
      URL.revokeObjectURL(audioState.url);
    }

    setAudioState({
      file,
      url: URL.createObjectURL(file),
      isPlaying: false,
      currentTime: 0,
      duration: 0
    });
  }, [audioState.url]);

  const handleAudioStateChange = useCallback((updates: Partial<AudioState>) => {
    setAudioState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleClearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    if (audioState.url) {
      URL.revokeObjectURL(audioState.url);
    }
    setImages([]);
    setAudioState({
      file: null,
      url: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0
    });
  }, [images, audioState.url]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Audio Reactive Image Visualizer</h1>
        <p>Upload HD images and audio to create stunning visualizations</p>
      </header>

      <div className="app-layout">
        <aside className={`sidebar ${showConfig ? 'open' : 'closed'}`}>
          <button
            className="toggle-sidebar"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? '◀' : '▶'}
          </button>

          {showConfig && (
            <>
              <ImageUpload onImagesAdd={handleImagesAdd} />
              <AudioUpload audioState={audioState} onAudioChange={handleAudioChange} />

              {images.length > 0 && (
                <div className="images-config">
                  <div className="config-header">
                    <h3>Image Settings ({images.length})</h3>
                    <button className="clear-btn" onClick={handleClearAll}>
                      Clear All
                    </button>
                  </div>

                  <div className="image-cards">
                    {images.map(image => (
                      <ImageCard
                        key={image.id}
                        image={image}
                        onUpdate={handleImageUpdate}
                        onRemove={handleImageRemove}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        <main className="main-content">
          <Visualizer
            images={images}
            frequencyData={frequencyData}
            isPlaying={audioState.isPlaying}
          />

          <AudioPlayer
            audioRef={audioRef}
            audioState={audioState}
            frequencyData={frequencyData}
            isInitialized={isInitialized}
            onAudioStateChange={handleAudioStateChange}
            onInitialize={initializeAnalyzer}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
