/**
 * Redimensiona y comprime una imagen en el navegador antes de enviarla a la IA.
 * Las fotos de móvil (4-12 MB) superan el límite de payload de Vercel (~4.5 MB);
 * 1280px en JPEG es más que suficiente para reconocer un plato.
 */
export const compressImage = (file, { maxSize = 1280, quality = 0.8 } = {}) =>
  new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };

    img.src = url;
  });
