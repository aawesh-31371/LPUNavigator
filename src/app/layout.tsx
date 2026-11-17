
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LPU Navigator | Campus Navigation",
  description:
    "Explore Lovely Professional University with an interactive campus map and location discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
