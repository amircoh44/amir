import { useCallback, useRef } from 'react';
import type { AudioState } from '../types';

interface AudioUploadProps {
  audioState: AudioState;
  onAudioChange: (file: File) => void;
}

export function AudioUpload({ audioState, onAudioChange }: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const audioFile = Array.from(files).find(file =>
      file.type.startsWith('audio/')
    );

    if (audioFile) {
      onAudioChange(audioFile);
    }
  }, [onAudioChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFiles]);

  return (
    <div className="upload-section">
      <h3>Upload Audio</h3>
      <div
        className={`drop-zone audio-drop ${audioState.file ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="drop-zone-content">
          {audioState.file ? (
            <>
              <span className="drop-icon">🎵</span>
              <p className="file-name">{audioState.file.name}</p>
              <p className="drop-hint">Click to change audio</p>
            </>
          ) : (
            <>
              <span className="drop-icon">🎧</span>
              <p>Drop audio file here or click to browse</p>
              <p className="drop-hint">MP3, WAV, OGG, etc.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
