const imageDataUrlCache = new Map<string, Promise<string>>();

type ImageToDataUrlOptions = {
  maxWidth?: number;
  maxHeight?: number;
  type?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
};

const getCacheKey = (src: string, options?: ImageToDataUrlOptions) =>
  options ? `${src}:${JSON.stringify(options)}` : src;

const resizeImageDataUrl = (
  dataUrl: string,
  options: Required<ImageToDataUrlOptions>
) =>
  new Promise<string>((resolve) => {
    const image = new Image();

    image.onload = () => {
      const ratio = Math.min(
        1,
        options.maxWidth / image.naturalWidth,
        options.maxHeight / image.naturalHeight
      );
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(dataUrl);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL(options.type, options.quality));
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });

export const imageToDataUrl = async (
  src: string,
  options?: ImageToDataUrlOptions
): Promise<string> => {
  const cacheKey = getCacheKey(src, options);
  const cached = imageDataUrlCache.get(cacheKey);
  if (cached) return cached;

  const conversion = (async () => {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error("Nao foi possivel carregar a imagem do PDF.");
    }
    const blob = await response.blob();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    if (!options) return dataUrl;

    return resizeImageDataUrl(dataUrl, {
      maxWidth: options.maxWidth ?? 800,
      maxHeight: options.maxHeight ?? 300,
      type: options.type ?? "image/jpeg",
      quality: options.quality ?? 0.86,
    });
  })();

  imageDataUrlCache.set(cacheKey, conversion);

  try {
    return await conversion;
  } catch (error) {
    imageDataUrlCache.delete(cacheKey);
    throw error;
  }
};
