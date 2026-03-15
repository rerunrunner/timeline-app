import React, { useState, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  revealId: number;
  filename?: string | null;
  onImageChange: (filename: string | null) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  revealId, 
  filename, 
  onImageChange, 
  disabled = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB limit
      alert('File size must be less than 1MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:5001/api/tables/reveal/${revealId}/image`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newFilename = await response.text();
        onImageChange(newFilename);
      } else {
        const errorText = await response.text();
        alert(`Upload failed: ${errorText}`);
      }
    } catch (error) {
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (disabled || !filename) return;

    try {
      const response = await fetch(`http://localhost:5001/api/tables/reveal/${revealId}/image`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onImageChange(null);
      } else {
        alert('Failed to delete image');
      }
    } catch (error) {
      alert(`Delete failed: ${error}`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const getImageUrl = (filename: string) => {
    return `http://localhost:5001/api/tables/reveal/${revealId}/image/${filename}`;
  };

  return (
    <div className="input-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {filename ? (
        // Image preview mode
        <div className="image-preview-wrapper">
          <div className="image-preview-container">
            <img
              src={getImageUrl(filename)}
              alt="Screenshot"
              className="image-preview"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          {!disabled && (
            <button
              onClick={handleDeleteImage}
              className="image-delete-btn"
              title="Delete image"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ) : (
        // Upload mode
        <div
          className={`image-upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {isUploading ? (
            <div className="upload-loading">
              <div className="spinner"></div>
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="upload-content">
              <ImageIcon size={24} />
              <span>Drop image here or click to upload</span>
              <small>Max 1MB, JPG/PNG</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
