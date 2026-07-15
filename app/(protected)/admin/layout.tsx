import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { getServerSessionFromCookies } from "@/lib/auth/session";

export default async function AdminLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const session = await getServerSessionFromCookies(cookieStore);

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "super") {
    redirect("/403");
  }

  return children;
}
