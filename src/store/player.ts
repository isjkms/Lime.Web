"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlayableTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  previewUrl?: string | null;
  spotifyId?: string | null;
  albumId?: string | null;
};

type PlayerState = {
  current: PlayableTrack | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  mode: "preview" | "spotify" | "idle";
  seekToken: number;
  seekMs: number;
  setCurrent: (t: PlayableTrack | null) => void;
  setPlaying: (v: boolean) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  setVolume: (v: number) => void;
  setMode: (m: "preview" | "spotify" | "idle") => void;
  seek: (ms: number) => void;
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set) => ({
      current: null,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      volume: 0.7,
      mode: "idle",
      seekToken: 0,
      seekMs: 0,
      setCurrent: (t) => set({ current: t, positionMs: 0 }),
      setPlaying: (v) => set({ isPlaying: v }),
      setPosition: (ms) => set({ positionMs: ms }),
      setDuration: (ms) => set({ durationMs: ms }),
      setVolume: (v) => set({ volume: v }),
      setMode: (m) => set({ mode: m }),
      seek: (ms) => set((s) => ({ seekToken: s.seekToken + 1, seekMs: ms, positionMs: ms })),
    }),
    {
      name: "lime-player",
      partialize: (s) => ({ current: s.current, volume: s.volume }),
    }
  )
);
