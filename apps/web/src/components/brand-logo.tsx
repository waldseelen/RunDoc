import React from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export default function BrandLogo({ size = 32, className = "" }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5e61e6" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Background soft shadow paper page sheet */}
      <rect
        x="6"
        y="8"
        width="16"
        height="20"
        rx="3"
        fill="#1a1a26"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1.5"
      />
      {/* Active compiler layer shape */}
      <path
        d="M10 4H22C23.6569 4 25 5.34315 25 7V21C25 22.6569 23.6569 24 22 24H10C8.34315 24 7 22.6569 7 21V7C7 5.34315 8.34315 4 10 4Z"
        fill="url(#logo-grad)"
        filter="url(#logo-glow)"
      />
      {/* Abstract document folds / Math infinity curve overlay */}
      <path
        d="M11 10H21M11 14H21M11 18H17"
        stroke="rgba(255, 255, 255, 0.85)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Infinity curve loop at the bottom right */}
      <path
        d="M20 16.5C18.5 16.5 17.5 18 19 19.5C20.5 21 22 21 23.5 19.5C25 18 24 16.5 22.5 16.5C21 16.5 20.5 18 19 19.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
