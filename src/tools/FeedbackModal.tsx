import React, { useState } from 'react';
import { fetchWithPrefix } from '../utils/api';
import review from '../assets/review.png';

interface FeedbackModalProps {
    onSetted: () => void; // Aggiungi la prop onSetted
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onSetted }) => {
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (comment.trim().length < 5) {
      alert('Please write a more complete feedback.');
      return;
    }

    try {
        const token = localStorage.getItem('authToken');
        await fetchWithPrefix('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token,  comment }),
        });

        setComment('');
        setShowModal(false);
        onSetted()
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('An error occurred while submitting feedback.');
    }
  };

  return (
    <>
      <span
            className="cursor-pointer"
            onClick={() => setShowModal(true)}
            >
            <img
                src={review}
                alt="Your feedback is very important!!!"
                className="w-6 h-6 cursor-pointer my-2"
            />
            </span>


      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg relative w-96"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 font-mono">
                Your Feedback
              </h2>
              <button
                className="text-gray-500 hover:text-black text-2xl font-semibold"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 font-mono mb-2 text-left">
              Leave a comment about your experience with Broken Chat!
            </p>

            {/* Textarea */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Your feedback..."
              className="border p-2 w-full h-28 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />

            {/* Submit button */}
            <div className="flex mt-4 justify-center">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-mono"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackModal;
