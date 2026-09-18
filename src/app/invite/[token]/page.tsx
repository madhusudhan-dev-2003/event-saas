import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { AcceptForm } from "@/components/forms";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Invite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await currentUser();
  return (
    <div className="public-card">
      <Link href="/" className="brand">
        ✳ utsava
      </Link>
      <h1>Plan something together.</h1>
      <p>
        Accept with the email address your invitation was created for. Your
        other spaces remain private.
      </p>
      {user ? (
        <AcceptForm token={token} />
      ) : (
        <Link
          className="primary"
          href={`/login?invite=${encodeURIComponent(token)}`}
        >
          Sign in or create an account
        </Link>
      )}
    </div>
  );
}
