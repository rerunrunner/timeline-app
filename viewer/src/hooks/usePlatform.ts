import { useState, useEffect } from 'react';

export type Platform = 'mobile' | 'tablet' | 'computer';
export type Orientation = 'portrait' | 'landscape';

const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

function getPlatform(width: number): Platform {
  if (width <= MOBILE_MAX) return 'mobile';
  if (width <= TABLET_MAX) return 'tablet';
  return 'computer';
}

function getOrientation(width: number, height: number): Orientation {
  return height >= width ? 'portrait' : 'landscape';
}

export function usePlatform(): { platform: Platform; orientation: Orientation } {
  const [platform, setPlatform] = useState<Platform>(() =>
    typeof window !== 'undefined'
      ? getPlatform(window.innerWidth)
      : 'computer'
  );
  const [orientation, setOrientation] = useState<Orientation>(() =>
    typeof window !== 'undefined'
      ? getOrientation(window.innerWidth, window.innerHeight)
      : 'landscape'
  );

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPlatform(getPlatform(w));
      setOrientation(getOrientation(w, h));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return { platform, orientation };
}
