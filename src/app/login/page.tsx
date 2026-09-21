import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms";
import { currentUser } from "@/lib/auth";
import { getShellContext } from "@/lib/space-context";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const q = await searchParams;
  const user = await currentUser();
  if (user) {
    if (q.invite && /^[a-f0-9]{64}$/.test(q.invite)) {
      redirect(`/invite/${q.invite}`);
    }
    const { spaceId } = await getShellContext();
    redirect(spaceId ? `/dashboard?space=${spaceId}` : "/spaces/new");
  }

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <img src="/auth-hero.png" alt="" />
        <div className="auth-story-veil" />
        <div className="auth-story-copy">
          <Link href="/login" className="auth-brand">
            utsava
          </Link>
          <div>
            <h1>Every gathering, held in one place.</h1>
            <p>
              Plan the day, the people, and the details — privately, with the
              ones who matter.
            </p>
          </div>
        </div>
      </aside>
      <main className="auth-form">
        <div className="auth-form-card">
          <h2>Welcome</h2>
          <p>Sign in or create an account to open your space.</p>
          <AuthForm invite={q.invite} />
        </div>
      </main>
    </div>
  );
}
