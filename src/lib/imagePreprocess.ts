/**
 * Client-side image pre-processing for improved OCR accuracy.
 * Uses the Canvas API to apply grayscale, contrast boost, sharpening,
 * and resize before sending to the AI model.
 */

const MAX_DIMENSION = 1024;
const CONTRAST_FACTOR = 1.6;
const JPEG_QUALITY = 0.85;

// 3×3 sharpening convolution kernel
const SHARPEN_KERNEL = [
   0, -1,  0,
  -1,  5, -1,
   0, -1,  0,
];

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function applyConvolution(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  w: number,
  h: number,
  kernel: number[],
) {
  const kSize = 3;
  const half = Math.floor(kSize / 2);
  for (let y = half; y < h - half; y++) {
    for (let x = half; x < w - half; x++) {
      let sum = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          const ki = (ky + half) * kSize + (kx + half);
          sum += src[idx] * kernel[ki]; // grayscale so R=G=B
        }
      }
      const idx = (y * w + x) * 4;
      const clamped = Math.max(0, Math.min(255, sum));
      dst[idx] = dst[idx + 1] = dst[idx + 2] = clamped;
      dst[idx + 3] = 255;
    }
  }
}

/**
 * Takes a data URL, returns a processed high-contrast grayscale data URL
 * optimised for OCR / imprint extraction.
 */
export async function preprocessForOCR(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);

  // Calculate target dimensions preserving aspect ratio
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // --- Pass 1: Grayscale conversion ---
  let mean = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
    mean += gray;
  }
  mean /= (pixels.length / 4);

  // --- Pass 2: Contrast normalisation ---
  for (let i = 0; i < pixels.length; i += 4) {
    const val = Math.max(0, Math.min(255, mean + (pixels[i] - mean) * CONTRAST_FACTOR));
    pixels[i] = pixels[i + 1] = pixels[i + 2] = val;
  }

  // --- Pass 3: Edge sharpening (convolution) ---
  const sharpened = new Uint8ClampedArray(pixels.length);
  sharpened.set(pixels); // copy border pixels
  applyConvolution(pixels, sharpened, width, height, SHARPEN_KERNEL);

  const outData = new ImageData(sharpened, width, height);
  ctx.putImageData(outData, 0, 0);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
