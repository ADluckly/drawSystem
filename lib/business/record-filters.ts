import { isValidObjectId, type FilterQuery } from "mongoose";

import type { RechargeDocument } from "@/models/recharge";
import type { SignDocument } from "@/models/sign";
import { StudentModel } from "@/models/student";

export interface RecordFilterInput {
  studentId?: string | null;
  classId?: string | null;
  fromDate?: Date;
  toDate?: Date;
}

async function resolveStudentFilter(input: RecordFilterInput) {
  if (input.studentId) {
    return isValidObjectId(input.studentId) ? [input.studentId] : [];
  }

  if (input.classId) {
    if (!isValidObjectId(input.classId)) {
      return [];
    }

    const studentIds = await StudentModel.find({ classId: input.classId }).distinct("_id");
    return studentIds.map((item) => String(item));
  }

  return null;
}

export async function buildRechargeFilter(
  input: RecordFilterInput & { paymentMethod?: string | null },
) {
  const query: FilterQuery<RechargeDocument> = {};
  const studentIds = await resolveStudentFilter(input);

  if (studentIds) {
    query.studentId = { $in: studentIds };
  }

  if (input.fromDate || input.toDate) {
    query.createdAt = {};
    if (input.fromDate) query.createdAt.$gte = input.fromDate;
    if (input.toDate) query.createdAt.$lte = input.toDate;
  }

  if (input.paymentMethod) {
    query.paymentMethod = input.paymentMethod;
  }

  return query;
}

export async function buildSignFilter(input: RecordFilterInput & { action?: string | null }) {
  const query: FilterQuery<SignDocument> = {};
  const studentIds = await resolveStudentFilter(input);

  if (studentIds) {
    query.studentId = { $in: studentIds };
  }

  if (input.fromDate || input.toDate) {
    query.signDate = {};
    if (input.fromDate) query.signDate.$gte = input.fromDate;
    if (input.toDate) query.signDate.$lte = input.toDate;
  }

  if (input.action) {
    query.action = input.action as "attend" | "leave";
  }

  return query;
}