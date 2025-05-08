import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchWithPrefix } from '../utils/api';
import Logo from '../assets/logo.png';

const RecoveryProfile: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetchWithPrefix('/get-recovery-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          recovery_code: recoveryCode,
        }),
      });

      localStorage.setItem("authToken", response.token);
      navigate("/");

    } catch (err) {
      console.error('Error recovering profile:', err);
      setError('Failed to retrieve profile.');
      setSuccessMessage('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <Link to="/" className="flex justify-center items-center">
        <img src={Logo} alt="Logo" />
      </Link>

      <h2 className="text-center text-2xl font-semibold mt-5 font-mono">Profile Recovery</h2>


      <div className="text-sm text-left p-2 text-gray-500 mt-2 font-mono">
            Enter your nickname and recovery code to retrieve your profile information.
          </div>

      <form onSubmit={handleSubmit} className="mt-2 w-full p-2">
        <div className="flex flex-col items-center gap-4 justify-center px-3 font-mono">
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
            required
          />
          <input
            type="text"
            placeholder="Recovery Code"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
            required
          />

          {error && <p className="text-red-500 my-4">{error}</p>}
          {successMessage && <p className="text-green-500 mt-2">{successMessage}</p>}
        </div>

        <div className="w-full flex justify-center mt-5">
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 text-white font-semibold py-2 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 w-full md:w-[400px]"
          >
            🚀 Recover Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecoveryProfile;
