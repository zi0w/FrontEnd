import { IS_DEMO_MODE } from "./demo-mode";
import type { ApiEnvelope } from "./types";

// API 호출 실패를 나타내는 오류. 상태 코드와 엔드포인트를 함께 보관.
export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

// base URL. 서버/클라이언트 양쪽에서 NEXT_PUBLIC_ 접두 env로 접근 가능.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// path(/api/... )를 base URL과 결합. 슬래시 중복/누락을 정규화.
// 브라우저에서는 same-origin 상대 경로를 반환해 next.config rewrites 프록시를 타게 한다
// (백엔드가 실제 응답에 CORS 헤더를 누락해 직접 호출이 차단되기 때문).
function buildUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  // 데모 모드는 네트워크를 쓰지 않으므로 base URL 없이 상대 경로로 라우팅
  if (typeof window !== "undefined" || IS_DEMO_MODE) {
    return suffix;
  }
  if (!BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL이 설정되지 않았습니다.", 0, path);
  }
  const base = BASE_URL.replace(/\/+$/, "");
  return `${base}${suffix}`;
}

// 데모 모드면 mock 응답, 아니면 실제 fetch. 동적 import라 비데모 모드에서는 픽스처 청크를 내려받지 않는다.
async function request(url: string, init: RequestInit): Promise<Response> {
  if (IS_DEMO_MODE) {
    const { mockFetch } = await import("./mock/mock-fetch");
    return mockFetch(url, init);
  }
  return fetch(url, init);
}

// GET 요청 후 { success, data } 봉투를 언랩. non-2xx이거나 success=false면 ApiError throw.
export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const response = await request(url, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(`요청 실패 (${response.status})`, response.status, path);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError("API가 실패 응답을 반환했습니다.", response.status, path);
  }
  return envelope.data;
}

// POST 요청 후 봉투를 언랩. body가 FormData면 Content-Type을 지정하지 않아 브라우저가 boundary를 자동 설정.
export async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const isFormData = body instanceof FormData;

  // FormData가 아닐 때만 Content-Type 지정. init?.headers를 마지막에 spread해 호출자가 덮어쓸 수 있게.
  const headers = isFormData
    ? { Accept: "application/json", ...init?.headers }
    : { Accept: "application/json", "Content-Type": "application/json", ...init?.headers };

  const response = await request(url, {
    method: "POST",
    ...init,
    body: isFormData ? body : JSON.stringify(body),
    headers,
  });

  if (!response.ok) {
    throw new ApiError(`요청 실패 (${response.status})`, response.status, path);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError("API가 실패 응답을 반환했습니다.", response.status, path);
  }
  return envelope.data;
}

// PATCH 요청 후 봉투를 언랩. 항상 JSON body.
export async function patchJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const headers = { Accept: "application/json", "Content-Type": "application/json", ...init?.headers };

  const response = await request(url, {
    method: "PATCH",
    ...init,
    body: JSON.stringify(body),
    headers,
  });

  if (!response.ok) {
    throw new ApiError(`요청 실패 (${response.status})`, response.status, path);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError("API가 실패 응답을 반환했습니다.", response.status, path);
  }
  return envelope.data;
}

// DELETE 요청. 백엔드가 204 No Content를 반환하므로 본문을 파싱하지 않음.
export async function deleteVoid(path: string, init?: RequestInit): Promise<void> {
  const url = buildUrl(path);
  const headers = { Accept: "application/json", ...init?.headers };

  const response = await request(url, {
    method: "DELETE",
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(`요청 실패 (${response.status})`, response.status, path);
  }
}
