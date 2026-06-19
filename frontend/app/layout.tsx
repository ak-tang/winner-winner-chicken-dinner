import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "🐔 Winner Winner Chicken Dinner",
  description: "AI-powered dinner party menu planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-amber-50 text-stone-900 antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
