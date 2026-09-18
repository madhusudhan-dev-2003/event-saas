import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Utsava | A home for every celebration",
  description:
    "Thoughtful planning for your next celebration. Templates, people, vendors, and one clear next step.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
