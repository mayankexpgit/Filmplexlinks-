"use client";

import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player/lazy';
import { Skeleton } from './ui/skeleton';

type AdPlayerProps = {
  onAdComplete: () => void;
  onAdProgress: (progress: { played: number; loaded: number; }) => void;
};

// This component will only be rendered on the client
export default function AdPlayer({ onAdComplete, onAdProgress }: AdPlayerProps) {
  const [isClient, setIsClient] = useState(false);
  const [adUrl, setAdUrl] = useState('https://s.magsrv.com/v1/vast.php?idzone=5716318');

  useEffect(() => {
    // This ensures that the component only renders on the client side,
    // preventing hydration errors with the react-player library.
    setIsClient(true);
  }, []);

  const handleAdError = (e: any) => {
    console.error("Ad Error:", e);
    // If there's an error (e.g., no ad available), proceed to the next step.
    onAdComplete();
  };

  if (!isClient) {
    // Show a skeleton loader on the server and during initial client render
    return <Skeleton className="w-full h-full aspect-video" />;
  }

  return (
    <ReactPlayer
      url={adUrl}
      playing={true}
      controls={true}
      width="100%"
      height="100%"
      config={{
        file: {
          attributes: {
            // VAST ads often need these attributes
            playsInline: true,
            muted: false,
          },
          forceVideo: true,
          forceSafariHLS: true,
          forceDash: true,
          forceHLS: true,
        },
      }}
      onEnded={onAdComplete}
      onError={handleAdError}
      onProgress={onAdProgress}
    />
  );
}
