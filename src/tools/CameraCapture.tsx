import React, { useState } from 'react';
import send from '../assets/send.png';

export default function CameraCapture({ onSendPhoto }: { onSendPhoto: (img: string) => void }) {

  const [image, setImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openGallery = () => {
    document.getElementById("gallery-input")?.click();
  };

  const resizeAndConvertToBase64 = (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
  
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
  
        // Calcola nuova dimensione proporzionale
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width *= scale;
          height *= scale;
        }
  
        canvas.width = width;
        canvas.height = height;
  
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas not supported');
  
        ctx.drawImage(img, 0, 0, width, height);
  
        // Converte in base64 JPEG con qualità compressa
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
  
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  

  const selectImageFromGallery = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setShowModal(true);
  
      resizeAndConvertToBase64(file)
        .then((base64Image: string) => {
          setImage(base64Image);
        })
        .catch((err: any) => {
          console.error('Errore nella riduzione immagine:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
  
      // 🧼 Reset dell'input per permettere future selezioni dello stesso file
      event.target.value = '';
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setImage(null);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={openGallery}
        title="Take or select a photo"
      >
        📷
      </button>

      <input
        id="gallery-input"
        type="file"
        accept="image/*"
        onChange={selectImageFromGallery}
        className="hidden"
      />

      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 shadow-lg relative w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Photo Preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-black text-2xl font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center items-center min-h-[200px]">
              {isLoading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-500" />
              ) : (
                image && <img src={image} alt="Selected" className="w-full h-auto max-h-[60vh] rounded object-contain" />
              )}
            </div>

            {!isLoading && (
              <div className="flex flex-row justify-center gap-4 mt-4">
                <button
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (image) {
                      onSendPhoto(image);
                      closeModal();
                    }
                  }}
                  className="bg-blue-500 text-white px-6 py-2 rounded-md flex items-center gap-2"
                >
                  <span>Send</span><img src={send} alt="Invia" className="w-6 h-6 rotate-[-45deg" />
                </button>
                
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
