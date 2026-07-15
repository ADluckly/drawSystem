import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiSessionMock = vi.fn();
const connectMongoDBMock = vi.fn();
const supportsMongoTransactionsMock = vi.fn();
const isTransactionUnsupportedErrorMock = vi.fn();
const signFindOneMock = vi.fn();
const signFindOneByIdempotencyMock = vi.fn();
const signCreateMock = vi.fn();
const studentFindByIdMock = vi.fn();
const studentUpdateOneMock = vi.fn();
const startSessionMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireApiSession: requireApiSessionMock,
}));

vi.mock("@/lib/mongodb", () => ({
  connectMongoDB: connectMongoDBMock,
  supportsMongoTransactions: supportsMongoTransactionsMock,
  isTransactionUnsupportedError: isTransactionUnsupportedErrorMock,
}));

vi.mock("@/models/sign", () => ({
  SignModel: {
    findOne: (query: unknown) => {
      if (typeof query === "object" && query && "idempotencyKey" in (query as Record<string, unknown>)) {
        return { lean: signFindOneByIdempotencyMock };
      }
      return { select: () => ({ lean: signFindOneMock }) };
    },
    create: signCreateMock,
  },
}));

vi.mock("@/models/student", () => ({
  StudentModel: {
    findById: () => ({
      session: () => ({
        select: () => ({ lean: studentFindByIdMock }),
      }),
    }),
    updateOne: studentUpdateOneMock,
  },
}));

vi.mock("mongoose", () => ({
  default: {
    startSession: startSessionMock,
  },
  isValidObjectId: () => true,
}));

describe("POST /api/signs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportsMongoTransactionsMock.mockResolvedValue(true);
    isTransactionUnsupportedErrorMock.mockReturnValue(false);
  });

  it("rejects duplicate sign for same student/day", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { adminId: "a1", username: "super", role: "super" },
    });
    connectMongoDBMock.mockResolvedValue(undefined);
    signFindOneByIdempotencyMock.mockResolvedValue(null);
    signFindOneMock.mockResolvedValue({ _id: "exists" });

    const { POST } = await import("@/app/api/signs/route");
    const req = new NextRequest("http://localhost/api/signs", {
      method: "POST",
      body: JSON.stringify({ studentId: "s1", action: "attend", signDate: "2026-07-15" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error.code).toBe("DUPLICATE_SIGN");
  });

  it("does not deduct lesson for leave", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { adminId: "a1", username: "teacher", role: "teacher" },
    });
    connectMongoDBMock.mockResolvedValue(undefined);
    signFindOneByIdempotencyMock.mockResolvedValue(null);
    signFindOneMock.mockResolvedValue(null);

    startSessionMock.mockResolvedValue({
      withTransaction: async (cb: () => Promise<void>) => {
        await cb();
      },
      endSession: vi.fn(async () => undefined),
    });

    studentFindByIdMock.mockResolvedValue({
      status: "active",
      lessonTotal: 7,
      lessonUsed: 2,
      lessonLeft: 5,
      lessonGift: 0,
    });
    signCreateMock.mockResolvedValue([{ _id: "new-id" }]);
    studentUpdateOneMock.mockResolvedValue({ acknowledged: true });

    const { POST } = await import("@/app/api/signs/route");
    const req = new NextRequest("http://localhost/api/signs", {
      method: "POST",
      body: JSON.stringify({ studentId: "s1", action: "leave", signDate: "2026-07-15" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.action).toBe("leave");
    expect(data.data.lessonCost).toBe(0);
  });
});
