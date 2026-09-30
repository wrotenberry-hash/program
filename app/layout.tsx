import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Program", template: "%s · Program" },
  description: "Run your school's program. Join your faction. Meet your rival.",
  applicationName: "Program",
  appleWebApp: { capable: true, title: "Program", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </div>
      </body>
    </html>
  );
}
