  export const resizeAndCompressImage = (
    file: File,
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.7
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        let { width, height } = img;

        // Calcola nuova dimensione proporzionale
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width *= scale;
          height *= scale;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas not supported");

        ctx.drawImage(img, 0, 0, width, height);

        // Converte direttamente in Blob (jpeg compresso)
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject("Errore nella compressione immagine");
          },
          mimeType,
          quality
        );
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };