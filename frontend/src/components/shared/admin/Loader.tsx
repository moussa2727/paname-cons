import React from "react";

interface LoaderProps {
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  loading = true,
  size = "md",
  className = "",
}) => {
  if (!loading) return null;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
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
    </div>
  );
};

export default Loader;