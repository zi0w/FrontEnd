"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { DEMO_CREDENTIALS, IS_DEMO_MODE } from "@/shared/api/demo-mode";
import { ApiError } from "@/shared/api/http-client";
import { signInAdmin } from "../api/signIn";

const CREDENTIAL_ERROR = "이메일, 비밀번호가 틀렸습니다.";
const SERVER_ERROR = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";

export function useAdminLogin() {
  const router = useRouter();
  // 데모 모드는 방문자가 바로 로그인할 수 있게 계정을 미리 채운다
  const [email, setEmailValue] = useState(IS_DEMO_MODE ? DEMO_CREDENTIALS.email : "");
  const [password, setPasswordValue] = useState(IS_DEMO_MODE ? DEMO_CREDENTIALS.password : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setEmail = (value: string) => {
    setEmailValue(value);
    if (error) setError(null);
  };
  const setPassword = (value: string) => {
    setPasswordValue(value);
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError(CREDENTIAL_ERROR);
      return;
    }

    setIsSubmitting(true);
    try {
      await signInAdmin({ email, password });
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code?.startsWith("AUTH_")) {
          setError(CREDENTIAL_ERROR);
        } else {
          setError(SERVER_ERROR);
        }
      } else {
        setError(SERVER_ERROR);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    setEmail,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  };
}
