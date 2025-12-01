import type { Metadata } from "next";
import ProfileLayout from '@/components/profile/ProfileLayout';

export const metadata: Metadata = {
  title: "RADSASfun - Panel klienta",
  description: "Panel klienta RADSASfun - zarządzanie rezerwacjami, fakturami i płatnościami",
};

/**
 * Profile Layout
 * Wraps all profile pages with ProfileLayout
 */
export default function ProfilePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileLayout>{children}</ProfileLayout>;
}

