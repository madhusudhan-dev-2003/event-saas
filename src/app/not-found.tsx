import Link from "next/link";
export default function NotFound() {
  return (
    <div className="public-card">
      <h1>This page isn’t available.</h1>
      <p>The link may have expired, or you may not have access.</p>
      <Link href="/" className="primary">
        Back to celebrations
      </Link>
    </div>
  );
}
