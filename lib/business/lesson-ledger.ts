export interface LessonLedger {
  lessonTotal: number;
  lessonUsed: number;
  lessonLeft: number;
  lessonGift: number;
}

export interface RechargeDelta {
  lessonAdded: number;
  giftAdded: number;
}

export function applyRechargeLedger(current: LessonLedger, delta: RechargeDelta): LessonLedger {
  const added = delta.lessonAdded + delta.giftAdded;

  return {
    lessonTotal: current.lessonTotal + added,
    lessonUsed: current.lessonUsed,
    lessonLeft: current.lessonLeft + added,
    lessonGift: current.lessonGift + delta.giftAdded,
  };
}

export interface SignDelta {
  action: "attend" | "leave";
  costPerSign?: number;
}

export function applySignLedger(current: LessonLedger, delta: SignDelta): LessonLedger {
  if (delta.action === "leave") {
    return { ...current };
  }

  const cost = delta.costPerSign ?? 1;
  if (cost <= 0) {
    throw new Error("Sign cost must be positive for attend action.");
  }

  if (current.lessonLeft < cost) {
    throw new Error("Insufficient lessons left.");
  }

  return {
    lessonTotal: current.lessonTotal,
    lessonUsed: current.lessonUsed + cost,
    lessonLeft: current.lessonLeft - cost,
    lessonGift: current.lessonGift,
  };
}
