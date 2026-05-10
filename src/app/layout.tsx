import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trip Planner",
  description: "Plan your trip with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`} suppressHydrationWarning>
      {/* suppressHydrationWarning prevents browser-extension attribute mismatches */}
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-sora), ui-sans-serif, system-ui, sans-serif" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
