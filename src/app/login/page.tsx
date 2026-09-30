import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-panel p-6">
      <h1 className="mb-1 text-xl font-bold">
        Reseller <span className="text-accent">Edge</span>
      </h1>
      <p className="mb-5 text-sm text-muted">Private sourcing intelligence. Sign in to continue.</p>
      {error && <p className="mb-3 text-sm text-bad">{error === "forbidden" ? "That account isn't allowed here." : "Sign-in failed. Try again."}</p>}
      <LoginForm next={safeNext} />
    </div>
  );
}
