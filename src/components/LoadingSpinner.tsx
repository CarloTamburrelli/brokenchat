import React from "react";
import Logo from '../assets/logo_without_text.png';

interface LoadingSpinnerProps {
  size?: number; // size icon, default 10px
  mt?: number; // margin top, default 5px
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 10, mt = 5 }) => {
  return (
    <div className={`flex justify-center items-center mt-${mt}`}>
      <div className={`animate-spin h-${size} w-${size}`}>
        <img alt="BrokenChat" src={Logo} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
