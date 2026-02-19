import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Plants & Pages",
  description: "A gamified reading tracker that grows your garden.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}