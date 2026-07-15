import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiSessionMock = vi.fn();
const connectMongoDBMock = vi.fn();
const classFindByIdMock = vi.fn();
const studentFindMock = vi.fn();
const batchFindOneMock = vi.fn();
const batchCreateMock = vi.fn();
const batchUpdateMock = vi.fn();
const executeStudentSignMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireApiSession: requireApiSessionMock,
}));

vi.mock("@/lib/mongodb", () => ({
  connectMongoDB: connectMongoDBMock,
}));

vi.mock("@/models/class", () => ({
  ClassModel: {
    findById: () => ({ select: () => ({ lean: classFindByIdMock }) }),
  },
}));

vi.mock("@/models/student", () => ({
  StudentModel: {
    find: () => ({
      select: () => ({
        sort: () => ({
          lean: studentFindMock,
        }),
      }),
    }),
  },
}));

vi.mock("@/models/batch-sign-job", () => ({
  BatchSignJobModel: {
    findOne: () => ({ lean: batchFindOneMock }),
    create: batchCreateMock,
    findByIdAndUpdate: () => ({ lean: batchUpdateMock }),
  },
}));

vi.mock("@/lib/business/sign-service", () => ({
  executeStudentSign: executeStudentSignMock,
  normalizeSignDate: () => ({
    signDate: new Date("2026-07-15T00:00:00.000Z"),
    signDateKey: "2026-07-15",
  }),
}));

vi.mock("mongoose", () => ({
  isValidObjectId: () => true,
}));

describe("POST /api/signs/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns partial success with failure list", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { adminId: "a1", username: "admin", role: "admin" },
    });
    connectMongoDBMock.mockResolvedValue(undefined);
    batchFindOneMock.mockResolvedValue(null);
    classFindByIdMock.mockResolvedValue({ _id: "c1", name: "A班", status: "active" });
    studentFindMock.mockResolvedValue([
      { _id: "s1", name: "stu1" },
      { _id: "s2", name: "stu2" },
    ]);
    batchCreateMock.mockResolvedValue({ _id: "job1" });
    executeStudentSignMock
      .mockResolvedValueOnce({ ok: true, id: "sign1", action: "attend", lessonCost: 1 })
      .mockResolvedValueOnce({ ok: false, code: "INSUFFICIENT_LESSON", message: "Insufficient lessons left." });
    batchUpdateMock.mockResolvedValue({ _id: "job1", status: "completed" });

    const { POST } = await import("@/app/api/signs/batch/route");
    const req = new NextRequest("http://localhost/api/signs/batch", {
      method: "POST",
      headers: { "x-idempotency-key": "batch-key-1" },
      body: JSON.stringify({ classId: "c1", action: "attend", signDate: "2026-07-15" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.successCount).toBe(1);
    expect(data.data.failureCount).toBe(1);
    expect(data.data.partialSuccess).toBe(true);
    expect(data.data.failures[0].studentName).toBe("stu2");
  });
});