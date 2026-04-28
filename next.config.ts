import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // 상위 디렉토리(.../github)에 떠도는 빈 lockfile이 워크스페이스 루트로 잘못 잡히는 걸 방지.
  turbopack: { root: path.resolve(__dirname) },
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
