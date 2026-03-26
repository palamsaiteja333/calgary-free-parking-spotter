import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calgary Free Parking Finder",
  description: "Map Calgary on-street parking zones that are free right now.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

