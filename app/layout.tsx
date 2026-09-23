import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TimeZoneCookie } from "@/components/timezone-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UpLifted",
  description: "Family workout tracker — lift, log, encourage, and compete on weekly consistency.",
};

export const viewport: Viewport = {
  themeColor: "#070d1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-navy-950 font-sans text-silver-200">
        <TimeZoneCookie />
        {children}
      </body>
    </html>
  );
}
