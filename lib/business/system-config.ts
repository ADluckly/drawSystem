import type { Types } from "mongoose";

import { SystemConfigModel } from "@/models/system-config";
import { StudentModel } from "@/models/student";

export const DEFAULT_SYSTEM_CONFIG = {
  defaultWarningThreshold: 3,
  exportMaxRecords: 2000,
  exportMaxDays: 93,
} as const;

export async function ensureSystemConfig() {
  const existing = await SystemConfigModel.findOne({ key: "system" }).lean();
  if (existing) {
    return existing;
  }

  const created = await SystemConfigModel.create({
    key: "system",
    ...DEFAULT_SYSTEM_CONFIG,
  });

  return created.toObject();
}

export async function getSystemConfig() {
  return ensureSystemConfig();
}

export async function updateSystemConfig(
  input: Partial<{
    defaultWarningThreshold: number;
    exportMaxRecords: number;
    exportMaxDays: number;
  }>,
  updatedBy: string,
) {
  const updated = await SystemConfigModel.findOneAndUpdate(
    { key: "system" },
    {
      $set: {
        ...input,
        updatedBy,
      },
      $setOnInsert: {
        key: "system",
      },
    },
    { new: true, upsert: true },
  ).lean();

  if (input.defaultWarningThreshold !== undefined) {
    await StudentModel.updateMany(
      {},
      {
        $set: {
          warningThreshold: input.defaultWarningThreshold,
          updatedBy: updatedBy as Types.ObjectId | string,
        },
      },
    );
  }

  return updated;
}