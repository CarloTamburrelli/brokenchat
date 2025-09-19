import React, { useState } from 'react';
import send from '../assets/send.png';
import cameraIcon from "../assets/camera.png"; 
import { fetchWithPrefix } from '../utils/api';
import { checkValidityDuration } from '../utils/Video/checkValidityDuration';

interface CameraCaptureProps {
  onSendFile: (type: 3 | 4, file: string) => void;
  resourceId: number | null;
  resourceType: 'chats' | 'conversations';
}

export default function CameraCapture({ onSendFile, resourceId, resourceType }: CameraCaptureProps) {

  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openGallery = () => {
    document.getElementById("gallery-input")?.click();
  };

  const resizeAndCompressImage = (
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
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject("Errore nella compressione immagine");
          },
          "image/jpeg",
          quality
        );
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

      if (file.type.startsWith('image/')) {
        const imageURL = URL.createObjectURL(file);
        setImage(imageURL);
      } else if (file.type.startsWith('video/')) {
        const videoURL = URL.createObjectURL(file);
        setVideo(videoURL);
      }
      setIsLoading(false);
  
      // 🧼 Reset dell'input per permettere future selezioni dello stesso file
      event.target.value = '';
    }
  };

  const onSendImage = async () => {
  if (!resourceId) {
    alert("You cannot send media files as the first private message");
    return;
  }

  if (!image) return; // tieni il File originale nello state

  setIsLoading(true);

  try {

    const blob = await fetch(image).then(r => r.blob());
    const file = new File([blob], "image.jpg", { type: blob.type });
    
    const compressedBlob = await resizeAndCompressImage(file);
    const compressedFile = new File([compressedBlob], "image.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("file", compressedFile);

    const response_json = await fetchWithPrefix(`/upload-image/${resourceId}?folder=${resourceType}`, {
      method: "POST",
      body: formData,
    });

    onSendFile(3, response_json.url);
  } catch (err) {
    console.error("Error uploading image:", err);
    alert("Error uploading image");
  } finally {
    setIsLoading(false);
    closeModal();
  }
};

  const onSendVideo = async () => {

    if (!resourceId) {
      alert("You cannot send media files as the first private message")
      return;
    }


    if (!video) {
      return;
    }
    setIsLoading(true);
    
    const blob = await fetch(video).then(r => r.blob());
    const file = new File([blob], "video.mp4", { type: blob.type });

    if (!await checkValidityDuration(file)) {
      alert("Video too long: max 2 mins duration.")
      closeModal();
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    try {

      const response_json = await fetchWithPrefix(`/upload-video/${resourceId}?folder=${resourceType}`, {
        method: "POST",
        body: formData,
      });

      setIsLoading(false);
      onSendFile(4, response_json.url);

    } catch (err) {
      console.error("Error uploading video:", err);
      alert("Error uploading video")
    }

    closeModal();
  }

  const closeModal = () => {
    setShowModal(false);
    setVideo(null);
    setImage(null);
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={openGallery}
        title="Take or select a photo"
        className="active:brightness-110 active:scale-125 transition duration-900 ease-in-out text-[23px]"
      >
        <img src={cameraIcon} alt="Upload a photo" className="w-8 h-7 cursor-pointer" />
      </button>

      <input
        id="gallery-input"
        type="file"
        accept="video/*,image/*,android/allowCamera"
        onChange={selectImageFromGallery}
        className="hidden"
      />

      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 shadow-lg relative w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">{
                image !== null ? 'Photo' : 'Video'
                } preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-black text-2xl font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col justify-center items-center min-h-[200px]">
              {isLoading ? (
                <>
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-500" />
                {video && <div className="text-gray-600 text-sm">Uploading video, please wait...</div>}
                </>
              ) : (
                <>
                  {image && (
                    <img
                      src={image}
                      alt="Selected"
                      className="w-full h-auto max-h-[60vh] rounded object-contain"
                    />
                  )}
                  {video && (
                    <video
                      src={video}
                      controls
                      className="w-full max-h-[60vh] rounded"
                    />
                  )}
                </>
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
                      onSendImage();
                    } else if (video) {
                      onSendVideo();
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
    </>
  );
}
