import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RADSASfun - rezerwacja",
  description: "Proces rezerwacji obozu RADSASfun",
};

export default function CampsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


