import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ImageItem, AnimationType } from '../types';

interface ImageUploadProps {
  onImagesAdd: (images: ImageItem[]) => void;
}

const DEFAULT_ANIMATIONS: AnimationType[] = ['bump', 'rotate', 'pulse', 'shake', 'bounce'];

export function ImageUpload({ onImagesAdd }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    const newImages: ImageItem[] = imageFiles.map((file, index) => ({
      id: uuidv4(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      animation: DEFAULT_ANIMATIONS[index % DEFAULT_ANIMATIONS.length],
      sensitivity: 50,
      frequencyRange: 'all',
      intensity: 70
    }));

    onImagesAdd(newImages);
  }, [onImagesAdd]);

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
    // Reset input so same files can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFiles]);

  return (
    <div className="upload-section">
      <h3>Upload Images</h3>
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="drop-zone-content">
          <span className="drop-icon">🖼️</span>
          <p>Drop HD images here or click to browse</p>
          <p className="drop-hint">Supports bulk upload - PNG, JPG, WebP, etc.</p>
        </div>
      </div>
    </div>
  );
}
