import dayjs from "dayjs";

export interface ParsedDateWindow {
  fromDate: Date;
  toDate: Date;
  fromDateKey: string;
  toDateKey: string;
}

export function parseDateWindow(input: {
  from?: string | null;
  to?: string | null;
  fallbackMode?: "day" | "month";
  maxDays: number;
}) {
  const mode = input.fallbackMode ?? "month";
  const fallbackBase = dayjs();
  const fallbackFrom = mode === "day" ? fallbackBase.startOf("day") : fallbackBase.startOf("month");
  const fallbackTo = mode === "day" ? fallbackBase.endOf("day") : fallbackBase.endOf("month");

  const parsedFrom = input.from ? dayjs(input.from) : fallbackFrom;
  const parsedTo = input.to ? dayjs(input.to) : fallbackTo;

  if (!parsedFrom.isValid() || !parsedTo.isValid()) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const from = parsedFrom.startOf("day");
  const to = parsedTo.endOf("day");

  if (to.isBefore(from)) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (to.diff(from, "day") + 1 > input.maxDays) {
    throw new Error("DATE_RANGE_TOO_LARGE");
  }

  return {
    fromDate: from.toDate(),
    toDate: to.toDate(),
    fromDateKey: from.format("YYYY-MM-DD"),
    toDateKey: to.format("YYYY-MM-DD"),
  } satisfies ParsedDateWindow;
}