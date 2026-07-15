import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { ProtectedShell } from "@/components/auth/protected-shell";
import { SessionSync } from "@/components/auth/session-sync";
import { getServerSessionFromCookies } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const session = await getServerSessionFromCookies(cookieStore);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <SessionSync session={session} />
      <ProtectedShell session={session}>{children}</ProtectedShell>
    </>
  );
}
