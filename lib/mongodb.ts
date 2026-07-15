import mongoose from "mongoose";

import { env } from "@/lib/env";

declare global {
  var mongooseConn:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
        supportsTransactions: boolean | null;
      }
    | undefined;
}

const cached = global.mongooseConn ?? {
  conn: null,
  promise: null,
  supportsTransactions: null,
};

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
        cached.supportsTransactions = null;
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

export async function supportsMongoTransactions() {
  if (cached.supportsTransactions !== null) {
    return cached.supportsTransactions;
  }

  await connectMongoDB();

  try {
    const db = mongoose.connection.db;
    if (!db) {
      cached.supportsTransactions = false;
      return cached.supportsTransactions;
    }

    const hello = await db.admin().command({ hello: 1 });
    cached.supportsTransactions = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch {
    cached.supportsTransactions = false;
  }

  return cached.supportsTransactions;
}

export function isTransactionUnsupportedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Transaction numbers are only allowed on a replica set member or mongos");
}
