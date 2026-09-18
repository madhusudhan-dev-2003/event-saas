import { ResetForm } from "@/components/account-forms";
import Link from "next/link";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Reset({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="public-card">
      <h1>A fresh start.</h1>
      <ResetForm token={token} />
      <Link className="text-button" href="/login">
        Return to sign in
      </Link>
    </div>
  );
}
