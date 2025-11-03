import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isVisible: boolean;
  onFadeComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible, onFadeComplete }) => {
  return (
    <div
      className={`loading-screen ${!isVisible ? 'fade-out' : ''}`}
      onTransitionEnd={() => {
        if (!isVisible && onFadeComplete) {
          onFadeComplete();
        }
      }}
    >
      <div className="loading-content">
        <h1 className="loading-title">Jump!</h1>
        <div className="spinner"></div>
        <p className="loading-text">Loading</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
