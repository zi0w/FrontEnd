// 백엔드 없이 동작하는 포트폴리오 데모 모드 여부(빌드 시 인라인)
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_CREDENTIALS = {
  email: "demo@jellysafe.kr",
  password: "demo1234",
} as const;
