import { SetPasswordForm } from "@/components/account-forms";
import Link from "next/link";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="public-card">
      <h1>Set your password.</h1>
      <p>Choose a password, confirm it, then you can sign in.</p>
      <SetPasswordForm token={token} />
      <Link className="text-button" href="/login">
        Return to sign in
      </Link>
    </div>
  );
}
