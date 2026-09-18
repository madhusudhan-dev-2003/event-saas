"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="public-card">
      <h1>We couldn’t open this page.</h1>
      <p>
        Please try again. If this is a new installation, check the database
        connection and apply the project’s migrations.
      </p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
