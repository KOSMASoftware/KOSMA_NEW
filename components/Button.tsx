
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const baseStyles = "px-6 py-3 rounded-full font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
    secondary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20",
    outline: "border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
