import Link from "next/link";
import { AuthForm } from "@/components/forms";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const q = await searchParams;
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Link href="/" className="brand">
          ✳ utsava
        </Link>
        <h1>
          For your people.
          <br />
          For your moments.
        </h1>
        <p>
          From the very first idea to the last thank-you, make every celebration
          feel a little easier.
        </p>
        <span className="auth-flower">✳</span>
      </div>
      <div className="auth-form">
        <p className="eyebrow">A WARM WELCOME</p>
        <h2>Your celebrations start here.</h2>
        <p>One account for your family, personal and company spaces.</p>
        <AuthForm invite={q.invite} />
      </div>
    </div>
  );
}
