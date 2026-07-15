import { model, models, Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const systemConfigSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 32, default: "system" },
    defaultWarningThreshold: { type: Number, required: true, min: 1, max: 99, default: 3 },
    exportMaxRecords: { type: Number, required: true, min: 100, max: 10000, default: 2000 },
    exportMaxDays: { type: Number, required: true, min: 1, max: 366, default: 93 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true, versionKey: false },
);

systemConfigSchema.index({ key: 1 }, { unique: true, name: "uk_system_config_key" });

export type SystemConfigDocument = InferSchemaType<typeof systemConfigSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SystemConfigModel: Model<SystemConfigDocument> =
  (models.SystemConfig as Model<SystemConfigDocument>) ||
  model<SystemConfigDocument>("SystemConfig", systemConfigSchema);