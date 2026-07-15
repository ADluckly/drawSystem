import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const SIGN_ACTIONS = ["attend", "leave"] as const;

const signSchema = new Schema(
  {
    idempotencyKey: { type: String, default: null, trim: true, maxlength: 64 },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    signDate: { type: Date, required: true },
    signDateKey: { type: String, required: true, trim: true, maxlength: 10 },
    action: { type: String, enum: SIGN_ACTIONS, required: true },
    lessonCost: { type: Number, required: true, min: 0, default: 0 },
    note: { type: String, default: "", maxlength: 256 },
    operatorId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    operatorName: { type: String, required: true, trim: true, maxlength: 32 },
  },
  { timestamps: true, versionKey: false },
);

signSchema.index({ studentId: 1, signDateKey: 1 }, { unique: true, name: "uk_sign_student_date" });
signSchema.index({ studentId: 1, createdAt: -1 }, { name: "idx_sign_student_created" });
signSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true, name: "uk_sign_idempotency" });

export type SignDocument = InferSchemaType<typeof signSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SignModel: Model<SignDocument> =
  (models.Sign as Model<SignDocument>) || model<SignDocument>("Sign", signSchema);
