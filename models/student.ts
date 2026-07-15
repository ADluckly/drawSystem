import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const STUDENT_STATUS = ["active", "inactive"] as const;

const studentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 32 },
    mobile: { type: String, required: true, trim: true, maxlength: 20 },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },
    classId: { type: Schema.Types.ObjectId, ref: "Class", default: null },
    status: { type: String, enum: STUDENT_STATUS, required: true, default: "active" },
    note: { type: String, default: "", maxlength: 256 },
    lessonTotal: { type: Number, required: true, min: 0, default: 0 },
    lessonUsed: { type: Number, required: true, min: 0, default: 0 },
    lessonLeft: { type: Number, required: true, min: 0, default: 0 },
    lessonGift: { type: Number, required: true, min: 0, default: 0 },
    lessonExpireAt: { type: Date, default: null },
    warningThreshold: { type: Number, required: true, min: 1, default: 3 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true, versionKey: false },
);

studentSchema.index({ mobile: 1 }, { unique: true, name: "uk_student_mobile" });
studentSchema.index({ name: 1, status: 1 }, { name: "idx_student_name_status" });
studentSchema.index({ classId: 1, status: 1 }, { name: "idx_student_class_status" });
studentSchema.index({ lessonLeft: 1, status: 1 }, { name: "idx_student_lesson_left_status" });

export type StudentDocument = InferSchemaType<typeof studentSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const StudentModel: Model<StudentDocument> =
  (models.Student as Model<StudentDocument>) || model<StudentDocument>("Student", studentSchema);
