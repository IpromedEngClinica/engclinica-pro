const imageDataUrlCache = new Map<string, Promise<string>>();

export const imageToDataUrl = async (src: string): Promise<string> => {
  const cached = imageDataUrlCache.get(src);
  if (cached) return cached;

  const conversion = (async () => {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error("Nao foi possivel carregar a imagem do PDF.");
    }
    const blob = await response.blob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  })();

  imageDataUrlCache.set(src, conversion);

  try {
    return await conversion;
  } catch (error) {
    imageDataUrlCache.delete(src);
    throw error;
  }
};
