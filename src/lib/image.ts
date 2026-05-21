export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: string;
}

/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * Automatically resizes image to stay within maxWidth/maxHeight, maintaining aspect ratio,
 * and outputs a lightweight WebP format. GIF files bypass this compression.
 * 
 * @param file The original File object from file input or drag-and-drop.
 * @param options Compression settings.
 * @returns A Promise resolving to the compressed File object.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    outputType = 'image/webp',
  } = options;

  // Preserve GIF animations by bypassing compression
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale down
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Draw image onto canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas rendering to a high-efficiency WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to extract canvas to blob'));
              return;
            }

            // Construct new filename with .webp extension
            const originalName = file.name;
            const lastDotIndex = originalName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
            const newName = `${baseName}.webp`;

            const compressedFile = new File([blob], newName, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image element from data URI'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file data'));
    };

    reader.readAsDataURL(file);
  });
}
