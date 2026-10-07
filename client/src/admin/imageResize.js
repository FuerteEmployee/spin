const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD = 6 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read. Please try another file.'));
    };
    img.src = url;
  });
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Phone photos are often 5-10 MB. Shrink to `maxSize` px on the long edge and re-encode,
// so backgrounds load quickly on mobile data. keepAlpha keeps transparency (logos).
export async function prepareImage(file, { maxSize, keepAlpha = false }) {
  if (!ACCEPTED.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');

  const img = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size <= 800 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

  let blob = await toBlob(canvas, 'image/webp', 0.85);
  // Browsers that can't encode WebP fall back to PNG, which is huge for photos
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, keepAlpha ? 'image/png' : 'image/jpeg', 0.85);
  }
  if (!blob) throw new Error('That image could not be processed. Please try another file.');
  if (blob.size > MAX_UPLOAD) throw new Error('That image is too large. Please use one under 6 MB.');
  return blob;
}
