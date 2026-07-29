"use client";

import { useEffect, useRef } from "react";

/** Looping header logo. React SSR drops the `muted` attribute, which makes
 *  browsers block autoplay — so we set it imperatively and kick playback. */
export function LogoVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* stays on poster frame if playback is blocked */
    });
  }, []);

  return (
    <video
      ref={ref}
      src="/logo.mp4"
      poster="/logo-poster.jpg"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden
      className={className}
    />
  );
}
