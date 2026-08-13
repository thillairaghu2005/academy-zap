"use client";

import * as React from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import type Player from "video.js/dist/types/player";

type PlayerOptions = {
  autoplay?: boolean;
  controls?: boolean;
  fluid?: boolean;
  playbackRates?: number[];
  preload?: string;
  responsive?: boolean;
  sources?: { src: string; type: string }[];
};

interface VideoPlayerProps {
  /** Changes re-init the player (lesson switch) */
  lessonKey: string;
  manifestUrl: string;
  captionsUrl: string | null;
  /** Resume seek target in seconds (0 = start) */
  resumeSeconds: number;
  onTimeUpdate?: (seconds: number) => void;
  onEnded?: () => void;
  onReady?: (player: Player) => void;
}

/**
 * video.js wrapper (Content §2.3 / F1). The real player uses the signed
 * HLS manifest from SignedManifest; in mock mode the URL is a public HLS
 * test stream with the same shape. Captions come from `captions_url` when
 * present, so the CC toggle only appears for captioned lessons.
 */
export function VideoPlayer({
  lessonKey,
  manifestUrl,
  captionsUrl,
  resumeSeconds,
  onTimeUpdate,
  onEnded,
  onReady,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playerRef = React.useRef<Player | null>(null);
  const resumeAppliedRef = React.useRef(false);

  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const options: PlayerOptions = {
      autoplay: false,
      controls: true,
      fluid: true,
      playbackRates: [0.75, 1, 1.25, 1.5, 1.75, 2],
      preload: "auto",
      responsive: true,
      sources: [{ src: manifestUrl, type: "application/x-mpegURL" }],
      // video.js v8 settings menu: playback speed is reachable via the gear.
      // We also expose an explicit speed control in the strip below the
      // player so the F1 playback-speed checklist item is visible directly.
    };

    const player = videojs(element, options, () => {
      resumeAppliedRef.current = false;

      // Resume position — seek once metadata is available.
      const tryResume = () => {
        if (resumeAppliedRef.current) return;
        const duration = player.duration();
        if (
          resumeSeconds > 5 &&
          typeof duration === "number" &&
          Number.isFinite(duration) &&
          resumeSeconds < duration - 5
        ) {
          player.currentTime(resumeSeconds);
          resumeAppliedRef.current = true;
        }
      };
      if (player.readyState() >= 1) tryResume();
      else player.one("loadedmetadata", tryResume);

      player.on("timeupdate", () => {
        onTimeUpdate?.(Math.floor(player.currentTime() ?? 0));
      });
      player.on("ended", () => onEnded?.());
      onReady?.(player);
    });

    playerRef.current = player;

    return () => {
      player.dispose();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey]);

  return (
    <div data-vjs-player className="w-full">
      {/* Captions come from the signed manifest's text track, added in the
          effect below — the native CC button appears when present. */}
       <video ref={videoRef} className="video-js vjs-big-play-centered" playsInline>
         {captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" /> : null}
       </video>
    </div>
  );
}
