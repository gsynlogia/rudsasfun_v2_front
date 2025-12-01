import ProfileLayout from '@/components/profile/ProfileLayout';

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

