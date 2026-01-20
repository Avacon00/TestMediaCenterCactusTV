import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cactus-400 focus:ring-offset-2 focus:ring-offset-midnight-950 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-cactus-600 hover:bg-cactus-500 text-white shadow-lg shadow-cactus-900/20 rounded-xl",
    secondary: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-xl border border-white/5",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded-xl",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white rounded-lg"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  // Determine if we have valid children to render
  const hasContent = React.Children.count(children) > 0 && children !== false && children !== null && children !== undefined;

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className={hasContent ? "mr-2" : ""}>{icon}</span>}
      {children}
    </button>
  );
};