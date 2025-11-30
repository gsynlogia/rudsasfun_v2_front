import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RADSASfun - ZARZĄDZANIE",
  description: "Panel administracyjny RADSASfun",
};

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

