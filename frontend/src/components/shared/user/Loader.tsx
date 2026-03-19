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
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          border-2 border-sky-600 border-t-transparent 
          rounded-full animate-spin
        `}
      />
    </div>
  );
};

export default Loader;
