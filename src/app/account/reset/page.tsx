import { ResetRequest } from "@/components/account-forms";
export default function Reset() {
  return (
    <div className="public-card">
      <h1>Let’s get you back in.</h1>
      <p>Enter your registered email. We will send a password reset link.</p>
      <ResetRequest />
    </div>
  );
}
