import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";

// Using Bebas Neue as a fallback/proxy for "Block Script" display font
const blockScript = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-block-script",
});

export const metadata: Metadata = {
  title: "Stream Alerts",
  description: "Custom alerts for Kick and Twitch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${blockScript.variable}`}>
        {children}
      </body>
    </html>
  );
}
