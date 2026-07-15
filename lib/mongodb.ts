import mongoose from "mongoose";

import { env } from "@/lib/env";

declare global {
  var mongooseConn:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };

global.mongooseConn = cached;

export async function connectMongoDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGODB_URI)
      .then((instance) => {
        console.info("[mongo] connected");
        return instance;
      })
      .catch((error: unknown) => {
        cached.promise = null;
        console.error("[mongo] connection failed", error);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
