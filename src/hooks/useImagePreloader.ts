import { useState, useEffect } from 'react';

/**
 * Preloads all game images before the game starts
 * Returns loading state and ensures minimum loading time of 5 seconds
 */
export const useImagePreloader = (imagePaths: string[], minLoadTime: number = 5000) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Start minimum time timer
    const minTimeTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadTime);

    // Preload all images
    const imagePromises = imagePaths.map((path) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          console.log(`Loaded: ${path}`);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load: ${path}`);
          resolve(); // Resolve anyway to not block loading
        };
        img.src = path;
      });
    });

    // Wait for all images to load
    Promise.all(imagePromises).then(() => {
      console.log('All images loaded');
      setImagesLoaded(true);
    });

    return () => {
      clearTimeout(minTimeTimer);
    };
  }, [imagePaths, minLoadTime]);

  // Only stop loading when both conditions are met:
  // 1. All images are loaded
  // 2. Minimum time has elapsed
  useEffect(() => {
    if (imagesLoaded && minTimeElapsed) {
      console.log('Loading complete - both images loaded and min time elapsed');
      setIsLoading(false);
    }
  }, [imagesLoaded, minTimeElapsed]);

  return { isLoading };
};
