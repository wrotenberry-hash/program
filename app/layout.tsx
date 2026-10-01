import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { FeedbackButton } from "@/components/feedback-button";

export const metadata: Metadata = {
  title: { default: "Program", template: "%s · Program" },
  description: "Build your school's program. Join your faction. Put your power up against your rival's.",
  applicationName: "Program",
  appleWebApp: { capable: true, title: "Program", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9f0ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1230" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </div>
        <Suspense fallback={null}>
          <FeedbackButton />
        </Suspense>
      </body>
    </html>
  );
}
