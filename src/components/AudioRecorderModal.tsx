import React, { useState, useRef} from "react";
import microphoneIcon from "../assets/audio.png"; 
import stopRecordingIcon from "../assets/stop_audio.png";
import send from '../assets/send.png';

const AudioRecorderModal: React.FC<{ onAudioRecorded: (audioBlob: Blob) => void }> = ({ onAudioRecorded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/mp4" });

        // ✅ Verifica che la modal sia ancora aperta prima di aggiornare lo stato
        if (audioBlob) {
          setAudioBlob(audioBlob);
          setAudioURL(URL.createObjectURL(audioBlob));
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setIsOpen(true); // Apri la modal quando parte la registrazione
    } catch (error: any) {
      alert("Errore nell’accesso al microfono: " + error.message)
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (audioBlob) {
      setAudioURL(URL.createObjectURL(audioBlob));
    }
  };

  const handleClose = () => {
    if (recording) stopRecording();
    setIsOpen(false);
    setAudioBlob(null);
    setAudioURL(null);
  };

  const handleConfirm = () => {
    if (audioBlob) {
      onAudioRecorded(audioBlob);
      handleClose();
    }
  };


  return (
    <>
      {/* 🔵 Icona microfono sempre visibile */}
      <button onClick={startRecording}
          className="active:brightness-110 active:scale-125 transition duration-900 ease-in-out"
      >
        <img src={microphoneIcon} alt="Microfono" className="w-8 h-7 cursor-pointer" />
      </button>

      {/* 🔴 Modal appare solo se `isOpen` */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20" onClick={handleClose}>
          <div className="bg-white p-6 rounded-lg shadow-lg relative w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
              {recording ? (<p className="text-red-600 font-bold text-center">Recording...</p>) : "Confirm recording"}
              </h2>
              <button className="text-gray-500 hover:text-black text-2xl font-semibold" onClick={handleClose}>✕</button>
            </div>

            {(!recording && audioURL) && (
              <audio controls src={audioURL} className="w-full mt-4" />
            )}

            {recording && (
              <div className="flex justify-center mt-4">
                <button onClick={stopRecording}>
                  <img src={stopRecordingIcon} alt="Stop" className="w-12 h-12 cursor-pointer" />
                </button>
              </div>
            )}

            {(!recording && audioURL) && (
              <div className="flex justify-center mt-4">
                <button 
                  onClick={handleConfirm} 
                  className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
                >
                  Invia 
                  <img src={send} alt="Invia" className="w-6 h-6" />
                </button>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AudioRecorderModal;
