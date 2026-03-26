import React from "react";

interface LoaderProps {
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean; // Nouvelle prop pour plein écran
  message?: string; // Message optionnel
}

const Loader: React.FC<LoaderProps> = ({
  loading = true,
  size = "md",
  className = "",
  fullScreen = false,
  message,
}) => {
  if (!loading) return null;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
    : "flex items-center justify-center";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Glow background */}
          <div
            className={`
              absolute inset-0 rounded-full blur-md opacity-60
              bg-linear-to-tr from-blue-500 to-blue-600
            `}
          />

          {/* Main spinner */}
          <div
            className={`
              ${sizeClasses[size]}
              rounded-full
              border-[3px]
              border-blue-500/30
              border-t-blue-600
              animate-spin
              relative
            `}
          />

          {/* Inner pulse */}
          <div
            className={`
              absolute inset-2 rounded-full
              bg-blue-500/20
              animate-ping
            `}
          />
        </div>
        
        {message && (
          <span className="text-slate-500 text-sm font-medium animate-pulse">
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default Loader;
