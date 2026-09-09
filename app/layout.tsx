import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JD Match Analyzer — AI-powered resume/JD fit scoring",
  description: "Paste a resume and a job description, get a streamed, structured fit analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
