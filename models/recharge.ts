import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const PAYMENT_METHODS = ["cash", "wechat", "alipay", "bank", "other"] as const;

const rechargeSchema = new Schema(
  {
    serialNo: { type: String, required: true, trim: true, maxlength: 40 },
    idempotencyKey: { type: String, default: null, trim: true, maxlength: 64 },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", default: null },
    packageName: { type: String, required: true, trim: true, maxlength: 64 },
    lessonAdded: { type: Number, required: true, min: 0 },
    giftAdded: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    expireAt: { type: Date, default: null },
    note: { type: String, default: "", maxlength: 256 },
    operatorId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    operatorName: { type: String, required: true, trim: true, maxlength: 32 },
  },
  { timestamps: true, versionKey: false },
);

rechargeSchema.index({ serialNo: 1 }, { unique: true, name: "uk_recharge_serial" });
rechargeSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, name: "uk_recharge_idempotency_key" },
);
rechargeSchema.index({ studentId: 1, createdAt: -1 }, { name: "idx_recharge_student_created" });

export type RechargeDocument = InferSchemaType<typeof rechargeSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const RechargeModel: Model<RechargeDocument> =
  (models.Recharge as Model<RechargeDocument>) ||
  model<RechargeDocument>("Recharge", rechargeSchema);
