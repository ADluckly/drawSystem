import { NextResponse } from "next/server";

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessBody<T>>({ success: true, data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
