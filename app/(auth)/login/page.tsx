import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next || "/dashboard";

  return <LoginForm nextPath={nextPath} />;
}
