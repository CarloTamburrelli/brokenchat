import React, { useState } from "react";
import { fetchWithPrefix } from "../../utils/api";
import defaultAvatarIcon from "../../assets/default_avatar.png";
import { resizeAndCompressImage } from "../../utils/Image/resizeAndCompressImage";
import deleteIcon from '../../assets/delete.png';

interface AvatarModalProps {
  currentAvatarUrl: string | null;
  onClose: () => void;
  onAvatarUpdated: (newUrl: string) => void;
}

const AvatarModal: React.FC<AvatarModalProps> = ({
  currentAvatarUrl,
  onClose,
  onAvatarUpdated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token");

      const mime = selectedFile.type; // es: "image/jpeg"
      const ext = mime.split("/")[1]; // "jpeg", "png", "gif"
      const filename = `image.${ext}`;
  
      let finalFile: File;
  
      if (ext === "jpeg" || ext === "jpg" || ext === "png") {
        // fai la compressione solo per jpg/png
        const file = new File([selectedFile], filename, { type: selectedFile.type });
        const compressedBlob = await resizeAndCompressImage(file);
        finalFile = new File([compressedBlob], filename, { type: selectedFile.type });
      } else {
        // gif o altri tipi → non comprimere
        finalFile = new File([selectedFile], filename, { type: selectedFile.type });
      }

      console.log("prima dell'invio...", finalFile, token)

      const formData = new FormData();
      formData.append("file", finalFile);
      formData.append("token", token);

      const response = await fetchWithPrefix("/update-avatar", {
        method: "POST",
        body: formData,
      });

      if (response.url) {
        onAvatarUpdated(response.url);
        onClose();
      } else {
        alert("Error updating avatar");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading avatar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const confirmed = window.confirm("Are you sure you want to remove your avatar?");
    if (!confirmed) return;
    
    const token = localStorage.getItem("authToken");

    try {
        await fetchWithPrefix(`/reset-avatar?token=${token}`, {
          method: "POST",
        });

      setPreview(null);
    } catch (err) {
      console.error("Error removing avatar:", err);
    }
  }


  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 rounded-lg shadow-lg relative w-96"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 font-mono">
            Change your avatar
          </h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center justify-center mb-4 relative">
          {/* Avatar */}
          <img
            src={preview ?? defaultAvatarIcon}
            alt="Current avatar"
            className="w-32 h-32 rounded-full object-cover border cursor-pointer hover:border-blue-500 hover:border-4"
            onClick={() => setIsPreviewOpen(true)}
          />

          {/* Delete Icon */}
          {preview && (
            <img
              src={deleteIcon} // path della tua icona
              alt="delete icon"
              className="ml-[-12px] relative -top-14 w-6 h-6 cursor-pointer hover:opacity-80 z-10" // sposta vicino al bordo destro
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAvatar();
              }}
            />
          )}
        </div>

        <div className="flex flex-col items-center mb-4 gap-2">
          {/* Testo di avviso su una riga */}
          <p className="text-sm text-gray-500 my-3">
            Upload an avatar that represents you, following our policies. {" "}
            <a
              href="/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500 hover:text-blue-700"
            >
              Terms of Use
            </a>
          </p>

          {/* Bottoni */}
          <div className="flex justify-center items-center gap-4">
            {/* File input */}
            <div className="flex justify-center">
              <label className="cursor-pointer bg-gray-200 px-4 py-2 font-mono rounded-md hover:bg-gray-300">
                {selectedFile ? "Change Image" : "Select New Avatar"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Submit button */}
            {selectedFile && (
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-blue-500 text-white px-6 py-2 rounded-md font-mono hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? "Uploading..." : "Confirm"}
                </button>
              </div>
            )}
          </div>
        </div>

        {isPreviewOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-30"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 text-white text-2xl font-bold z-40 hover:text-gray-300"
            >
              ✕
            </button>

            {/* Full-size avatar */}
            <img
              src={preview ?? defaultAvatarIcon}
              alt="Avatar preview"
              className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AvatarModal;
