import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jellysafe/design-system"],
  // 백엔드가 실제 응답에 CORS 헤더를 누락해 브라우저 직접 호출이 차단됨.
  // /api/* 를 Next 서버가 백엔드로 프록시해 same-origin으로 우회한다.
  async rewrites() {
    // 데모 모드는 브라우저 내 mock으로 응답하므로 프록시 불필요
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return [];
    const target = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    if (!target) return [];
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;