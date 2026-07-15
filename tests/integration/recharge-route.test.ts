import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiSessionMock = vi.fn();
const connectMongoDBMock = vi.fn();
const supportsMongoTransactionsMock = vi.fn();
const isTransactionUnsupportedErrorMock = vi.fn();
const rechargeFindOneMock = vi.fn();
const rechargeCreateMock = vi.fn();
const studentFindByIdMock = vi.fn();
const studentUpdateOneMock = vi.fn();
const courseFindByIdMock = vi.fn();
const startSessionMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireApiSession: requireApiSessionMock,
}));

vi.mock("@/lib/mongodb", () => ({
  connectMongoDB: connectMongoDBMock,
  supportsMongoTransactions: supportsMongoTransactionsMock,
  isTransactionUnsupportedError: isTransactionUnsupportedErrorMock,
}));

vi.mock("@/models/recharge", () => ({
  PAYMENT_METHODS: ["cash", "wechat", "alipay", "bank", "other"],
  RechargeModel: {
    findOne: () => ({ lean: rechargeFindOneMock }),
    create: rechargeCreateMock,
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

vi.mock("@/models/course", () => ({
  CourseModel: {
    findById: () => ({
      session: () => ({
        select: () => ({ lean: courseFindByIdMock }),
      }),
    }),
  },
}));

vi.mock("mongoose", () => ({
  default: {
    startSession: startSessionMock,
  },
  isValidObjectId: () => true,
}));

describe("POST /api/recharges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportsMongoTransactionsMock.mockResolvedValue(true);
    isTransactionUnsupportedErrorMock.mockReturnValue(false);
  });

  it("returns forbidden for teacher role", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 }),
    });

    const { POST } = await import("@/app/api/recharges/route");
    const req = new NextRequest("http://localhost/api/recharges", {
      method: "POST",
      body: JSON.stringify({ studentId: "s1", amount: 100, paymentMethod: "cash" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("updates student lesson ledger atomically after recharge", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { adminId: "a1", username: "admin", role: "admin" },
    });
    connectMongoDBMock.mockResolvedValue(undefined);
    rechargeFindOneMock.mockResolvedValue(null);

    startSessionMock.mockResolvedValue({
      withTransaction: async (cb: () => Promise<void>) => {
        await cb();
      },
      endSession: vi.fn(async () => undefined),
    });

    studentFindByIdMock.mockResolvedValue({
      status: "active",
      lessonTotal: 10,
      lessonUsed: 2,
      lessonLeft: 8,
      lessonGift: 1,
    });
    courseFindByIdMock.mockResolvedValue(null);
    rechargeCreateMock.mockResolvedValue([{ _id: "r1", serialNo: "RC123" }]);
    studentUpdateOneMock.mockResolvedValue({ acknowledged: true });

    const { POST } = await import("@/app/api/recharges/route");
    const req = new NextRequest("http://localhost/api/recharges", {
      method: "POST",
      body: JSON.stringify({
        studentId: "s1",
        packageName: "测试充值",
        lessonAdded: 5,
        giftAdded: 2,
        amount: 500,
        paymentMethod: "cash",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.serialNo).toBe("RC123");

    const updateArg = studentUpdateOneMock.mock.calls[0][1];
    expect(updateArg.$set.lessonTotal).toBe(17);
    expect(updateArg.$set.lessonUsed).toBe(2);
    expect(updateArg.$set.lessonLeft).toBe(15);
  });
});
