"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { isAdminAuthenticated } from "../model/admin-session";

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

function subscribe() {
  return () => {};
}

function getClientStatus(): AuthStatus {
  return isAdminAuthenticated() ? "authenticated" : "unauthenticated";
}

// 서버·하이드레이션 렌더에서는 sessionStorage를 읽을 수 없으므로 "unknown"으로 둔다.
function getServerStatus(): AuthStatus {
  return "unknown";
}

// sessionStorage 기반 임시 가드. 백엔드 인증 확정 시 서버 세션 검증으로 교체한다.
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useSyncExternalStore(
    subscribe,
    getClientStatus,
    getServerStatus,
  );

  useEffect(() => {
    // 하이드레이션 커밋의 effect는 서버 스냅샷으로 실행되므로 확정된 미인증일 때만 이동한다.
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") return null;

  return children;
}
