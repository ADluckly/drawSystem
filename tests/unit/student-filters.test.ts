import { describe, expect, it } from "vitest";

import { buildStudentFilterQuery } from "@/lib/business/student-filters";

describe("student-filters", () => {
  it("builds keyword and mobile filters", () => {
    const query = buildStudentFilterQuery({
      keyword: "张",
      mobile: "138",
      status: "active",
    });

    expect(query.status).toBe("active");
    expect(query.name).toEqual({ $regex: "张", $options: "i" });
    expect(query.mobile).toEqual({ $regex: "138", $options: "i" });
  });

  it("builds low lesson warning filter", () => {
    const query = buildStudentFilterQuery({ lessonStatus: "low" });
    expect(query.$expr).toEqual({ $lte: ["$lessonLeft", "$warningThreshold"] });
  });

  it("builds normal lesson filter", () => {
    const query = buildStudentFilterQuery({ lessonStatus: "normal" });
    expect(query.$expr).toEqual({ $gt: ["$lessonLeft", "$warningThreshold"] });
  });
});
