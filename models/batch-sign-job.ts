import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

import { SIGN_ACTIONS } from "@/models/sign";

const batchSignJobSchema = new Schema(
  {
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 64 },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    signDateKey: { type: String, required: true, trim: true, maxlength: 10 },
    action: { type: String, enum: SIGN_ACTIONS, required: true },
    requestedStudentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    totalCount: { type: Number, required: true, min: 0, default: 0 },
    successCount: { type: Number, required: true, min: 0, default: 0 },
    failureCount: { type: Number, required: true, min: 0, default: 0 },
    failures: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        studentName: { type: String, required: true, trim: true, maxlength: 32 },
        code: { type: String, required: true, trim: true, maxlength: 40 },
        message: { type: String, required: true, trim: true, maxlength: 128 },
      },
    ],
    status: {
      type: String,
      enum: ["processing", "completed"],
      required: true,
      default: "processing",
    },
    operatorId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    operatorName: { type: String, required: true, trim: true, maxlength: 32 },
  },
  { timestamps: true, versionKey: false },
);

batchSignJobSchema.index({ idempotencyKey: 1 }, { unique: true, name: "uk_batch_sign_idempotency" });
batchSignJobSchema.index({ classId: 1, signDateKey: 1, createdAt: -1 }, { name: "idx_batch_sign_class_date" });

export type BatchSignJobDocument = InferSchemaType<typeof batchSignJobSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const BatchSignJobModel: Model<BatchSignJobDocument> =
  (models.BatchSignJob as Model<BatchSignJobDocument>) ||
  model<BatchSignJobDocument>("BatchSignJob", batchSignJobSchema);