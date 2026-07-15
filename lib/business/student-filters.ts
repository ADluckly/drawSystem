import type { FilterQuery } from "mongoose";

import type { StudentDocument } from "@/models/student";

export interface StudentFilterInput {
  keyword?: string;
  mobile?: string;
  classId?: string;
  lessonStatus?: "low" | "normal";
  status?: "active" | "inactive";
}

export function buildStudentFilterQuery(input: StudentFilterInput) {
  const query: FilterQuery<StudentDocument> = {};

  if (input.status) {
    query.status = input.status;
  }

  if (input.mobile) {
    query.mobile = { $regex: input.mobile.trim(), $options: "i" };
  }

  if (input.keyword) {
    query.name = { $regex: input.keyword.trim(), $options: "i" };
  }

  if (input.classId) {
    query.classId = input.classId;
  }

  if (input.lessonStatus === "low") {
    query.$expr = { $lte: ["$lessonLeft", "$warningThreshold"] };
  }

  if (input.lessonStatus === "normal") {
    query.$expr = { $gt: ["$lessonLeft", "$warningThreshold"] };
  }

  return query;
}
