import { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { StudentModel } from "@/models/student";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, ["super", "admin", "teacher"]);
  if (!auth.ok) return auth.response;

  await connectMongoDB();

  const items = await StudentModel.find({
    status: "active",
    $expr: { $lte: ["$lessonLeft", "$warningThreshold"] },
  })
    .select("name mobile lessonLeft warningThreshold classId")
    .populate("classId", "name")
    .sort({ lessonLeft: 1 })
    .limit(20)
    .lean();

  return successResponse({
    items: items.map((item) => {
      const classRef = item.classId as unknown as { name: string } | undefined;

      return {
        id: String(item._id),
        name: item.name,
        mobile: item.mobile,
        lessonLeft: item.lessonLeft,
        warningThreshold: item.warningThreshold,
        className: classRef ? classRef.name : null,
      };
    }),
  });
}
