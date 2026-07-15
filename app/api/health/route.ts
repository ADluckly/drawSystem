import { connectMongoDB } from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    await connectMongoDB();

    return successResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(
      "DB_CONNECTION_FAILED",
      "Database connection failed.",
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
