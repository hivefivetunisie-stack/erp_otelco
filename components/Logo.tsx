
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 120 }) => {
  // On calcule le ratio pour garder les proportions du logo horizontal
  const width = size;
  const height = size * 0.4;

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 500 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Premier O - Cercle coupé */}
      <path 
        d="M100 150C127.614 150 150 127.614 150 100C150 94.7523 149.191 89.6938 147.691 84.945L54.945 147.691C59.6938 149.191 64.7523 150 70 150H100Z" 
        fill="#1a2a3a" 
      />
      <path 
        d="M100 50C72.3858 50 50 72.3858 50 100C50 105.248 50.8087 110.306 52.3087 115.055L145.055 52.3087C140.306 50.8087 135.248 50 130 50H100Z" 
        fill="#1abc9c" 
      />

      {/* T */}
      <path d="M175 65V135M160 65H190" stroke="#3498db" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* E */}
      <path d="M215 65H245M215 100H235M215 135H245M215 65V135" stroke="#2c3e50" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* L */}
      <path d="M270 65V135H300" stroke="#5d6d7e" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* C */}
      <path d="M355 75C350 65 340 60 330 60C315 60 305 75 305 100C305 125 315 140 330 140C340 140 350 135 355 125" stroke="#2980b9" strokeWidth="18" strokeLinecap="round" />

      {/* Dernier O - Segmenté */}
      <path 
        d="M400 100C400 72.3858 422.386 50 450 50C477.614 50 500 72.3858 500 100" 
        stroke="#a3c971" 
        strokeWidth="20" 
        fill="none"
        transform="translate(-30, 0)"
      />
      <path 
        d="M500 100C500 127.614 477.614 150 450 150C422.386 150 400 127.614 400 100" 
        stroke="#e67e22" 
        strokeWidth="20" 
        strokeDasharray="80 100"
        fill="none"
        transform="translate(-30, 0)"
      />
    </svg>
  );
};

export default Logo;
