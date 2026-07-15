import { describe, expect, it } from "vitest";

import { applyRechargeLedger, applySignLedger } from "@/lib/business/lesson-ledger";

describe("lesson-ledger", () => {
  it("adds lessons correctly on recharge", () => {
    const result = applyRechargeLedger(
      { lessonTotal: 10, lessonUsed: 3, lessonLeft: 7, lessonGift: 2 },
      { lessonAdded: 8, giftAdded: 1 },
    );

    expect(result).toEqual({ lessonTotal: 19, lessonUsed: 3, lessonLeft: 16, lessonGift: 3 });
  });

  it("decrements lessons for attend sign", () => {
    const result = applySignLedger(
      { lessonTotal: 12, lessonUsed: 2, lessonLeft: 10, lessonGift: 1 },
      { action: "attend", costPerSign: 1 },
    );

    expect(result.lessonUsed).toBe(3);
    expect(result.lessonLeft).toBe(9);
  });

  it("keeps lessons unchanged for leave sign", () => {
    const current = { lessonTotal: 12, lessonUsed: 2, lessonLeft: 10, lessonGift: 1 };
    const result = applySignLedger(current, { action: "leave" });

    expect(result).toEqual(current);
  });

  it("throws on insufficient lessons", () => {
    expect(() =>
      applySignLedger(
        { lessonTotal: 2, lessonUsed: 2, lessonLeft: 0, lessonGift: 0 },
        { action: "attend", costPerSign: 1 },
      ),
    ).toThrow("Insufficient lessons left");
  });
});
