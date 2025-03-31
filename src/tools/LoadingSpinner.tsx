import React from "react";
import Logo from '../assets/logo_without_text.png';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center mt-5">
      <div className="animate-spin h-10 w-10">
        <img alt="BrokenChat" src={Logo} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
