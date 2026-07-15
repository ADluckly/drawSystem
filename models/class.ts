import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const CLASS_STATUS = ["active", "inactive"] as const;

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 64 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
    teacherId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    teacherName: { type: String, default: "", trim: true, maxlength: 32 },
    status: { type: String, enum: CLASS_STATUS, default: "active", required: true },
    note: { type: String, default: "", maxlength: 256 },
  },
  { timestamps: true, versionKey: false },
);

classSchema.index({ code: 1 }, { unique: true, name: "uk_class_code" });
classSchema.index({ name: 1 }, { name: "idx_class_name" });
classSchema.index({ teacherId: 1, status: 1 }, { name: "idx_class_teacher_status" });

export type ClassDocument = InferSchemaType<typeof classSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ClassModel: Model<ClassDocument> =
  (models.Class as Model<ClassDocument>) || model<ClassDocument>("Class", classSchema);
