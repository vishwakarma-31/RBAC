import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "RBAC Configuration Tool",
  description: "A modern Role-Based Access Control configuration tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}