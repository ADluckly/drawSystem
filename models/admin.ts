import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

export const ADMIN_ROLES = ["super", "admin", "teacher"] as const;
export const ADMIN_STATUS = ["active", "disabled"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminStatus = (typeof ADMIN_STATUS)[number];

const adminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ADMIN_ROLES,
      required: true,
      default: "teacher",
    },
    status: {
      type: String,
      enum: ADMIN_STATUS,
      required: true,
      default: "active",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    disabledBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

adminSchema.index({ username: 1 }, { unique: true, name: "uk_admin_username" });
adminSchema.index({ role: 1, status: 1 }, { name: "idx_admin_role_status" });

export type AdminDocument = InferSchemaType<typeof adminSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AdminModel: Model<AdminDocument> =
  (models.Admin as Model<AdminDocument>) || model<AdminDocument>("Admin", adminSchema);
