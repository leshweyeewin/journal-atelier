import React from "react";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ size = 32, className = "" }) => {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      role="img"
      aria-label="Journal Atelier"
      className={className}
    >
      <rect width="80" height="80" rx="18" fill="#b08d4f" />
      <text
        x="40"
        y="55"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="42"
        fill="#1c1917"
        textAnchor="middle"
        letterSpacing="-1"
      >
        JA
      </text>
    </svg>
  );
};
