import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 친구 테스트용 배포 단계. TS strict로 잡힌 잔존 암시적 any들은 별도로 정리.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "lineup-images.scdn.co" },
    ],
  },
};

export default nextConfig;
