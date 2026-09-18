import { VerificationForm } from "@/components/account-forms";
import Link from "next/link";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Verify({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="public-card">
      <h1>Make yourself at home.</h1>
      <p>Verify the email address associated with this private link.</p>
      <VerificationForm token={token} />
      <Link className="text-button" href="/account">
        Return to your account
      </Link>
    </div>
  );
}
