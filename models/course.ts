import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const COURSE_STATUS = ["active", "inactive"] as const;

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 64 },
    category: { type: String, required: true, trim: true, maxlength: 32, default: "默认分类" },
    lessonCount: { type: Number, required: true, min: 0 },
    giftLesson: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    expireDays: { type: Number, required: true, min: 1, default: 365 },
    status: { type: String, enum: COURSE_STATUS, default: "active", required: true },
    note: { type: String, default: "", maxlength: 256 },
  },
  { timestamps: true, versionKey: false },
);

courseSchema.index({ status: 1, category: 1, name: 1 }, { name: "idx_course_status_category_name" });

export type CourseDocument = InferSchemaType<typeof courseSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CourseModel: Model<CourseDocument> =
  (models.Course as Model<CourseDocument>) || model<CourseDocument>("Course", courseSchema);
