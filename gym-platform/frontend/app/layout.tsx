import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymOS — AI Gym Management",
  description: "Replace WhatsApp, Excel, and billing chaos with one AI-powered platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
