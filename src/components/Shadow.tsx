import React from 'react';

interface ShadowProps {
  x: number; // Character's X position
  characterY: number; // Character's Y position (center of base ball)
  floorY: number; // Floor Y position
  characterWidth: number; // Character's width (including growth)
  baseSize: number; // Base ball size (before growth)
  growthLevel: number; // Growth level
  maxBlur?: number; // Maximum blur at highest point (default 15px)
  minOpacity?: number; // Minimum opacity at highest point (default 0.2)
}

export const Shadow: React.FC<ShadowProps> = ({
  x,
  characterY,
  floorY,
  characterWidth,
  baseSize,
  growthLevel,
  maxBlur = 15,
  minOpacity = 0.2,
}) => {
  // Character is circular, so height = width
  const characterHeight = characterWidth;
  const growthAmount = characterWidth - baseSize;

  // Calculate the actual rendered bottom position of the character
  // Player/Enemy components offset Y by full growthAmount to maintain floor contact
  // So the rendered position is: characterY - growthAmount
  // And the bottom edge is: (characterY - growthAmount) + characterHeight
  // Simplified: characterY + (characterHeight - growthAmount)
  const renderedBottom = characterY + (characterHeight - growthAmount);

  // Calculate distance from floor (0 = on floor, positive = in air)
  const distanceFromFloor = floorY - renderedBottom;
  const maxDistance = floorY * 0.5; // Maximum distance we calculate shadow for

  // Normalize distance (0 = on floor, 1 = far away)
  const normalizedDistance = Math.min(Math.max(distanceFromFloor / maxDistance, 0), 1);

  // Calculate shadow properties based on distance
  const maxOpacity = 0.7; // Maximum opacity when on ground (not full black)
  const opacity = maxOpacity - (normalizedDistance * (maxOpacity - minOpacity)); // 0.7 when close, minOpacity when far
  const blur = normalizedDistance * maxBlur; // 0 when close, maxBlur when far
  const widthScale = 1 - (normalizedDistance * 0.5); // 1.0 when close, 0.5 when far

  // Shadow dimensions (dynamically scales with character width)
  const shadowWidth = characterWidth * widthScale;
  const shadowHeight = 8; // Fixed short height for shadow

  // Account for growth offset
  // X: Player/Enemy component offsets by growthAmount/2 horizontally
  const centeredX = x - (growthAmount / 2);

  // Shadow stays on floor, positioned under character horizontally
  // Center shadow under the scaled character
  const shadowX = centeredX + (characterWidth - shadowWidth) / 2;

  // Shadow positioned at floor, offset down by half the character's height
  // This pushes shadow further down as character grows
  const shadowY = floorY + (characterHeight / 2) - shadowHeight / 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${shadowX}px`,
        top: `${shadowY}px`,
        width: `${shadowWidth}px`,
        height: `${shadowHeight}px`,
        backgroundColor: 'black',
        borderRadius: '50%',
        opacity: opacity,
        filter: `blur(${blur}px)`,
        pointerEvents: 'none',
        zIndex: 0, // Behind characters (players are at default z-index)
      }}
    />
  );
};
