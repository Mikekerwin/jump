/**
 * SoundToggleButton Component
 * Renders a button to toggle sound on/off
 */

import React from 'react';

interface SoundToggleButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const SoundToggleButton: React.FC<SoundToggleButtonProps> = ({ isMuted, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '50px', // Position to the left of fullscreen button
        width: '24px',
        height: '24px',
        cursor: 'pointer',
        zIndex: 1000,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Speaker icon using SVG line art */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Speaker body */}
        <path d="M11 5L6 9H2v6h4l5 4V5z" />

        {/* Sound waves (only show when not muted) */}
        {!isMuted && (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M18.36 5.64a9 9 0 0 1 0 12.72" />
          </>
        )}

        {/* X mark when muted */}
        {isMuted && (
          <>
            <line x1="16" y1="9" x2="22" y2="15" />
            <line x1="22" y1="9" x2="16" y2="15" />
          </>
        )}
      </svg>
    </div>
  );
};
