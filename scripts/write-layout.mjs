import fs from "fs";

const content = `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { SignalFlowProvider } from "@/lib/signalflow-store";
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
  title: "SignalFlow",
  description: "Signal intelligence for growth teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased\`}
      >
        <SignalFlowProvider>{children}</SignalFlowProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
`;

fs.writeFileSync("src/app/layout.tsx", content, "utf8");
console.log("Wrote src/app/layout.tsx");
