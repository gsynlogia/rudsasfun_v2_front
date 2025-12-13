import ProfileLayoutComponent from '@/components/profile/ProfileLayout';
import ProfileAuthWrapper from '@/components/ProfileAuthWrapper';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileAuthWrapper>
      <ProfileLayoutComponent>
        {children}
      </ProfileLayoutComponent>
    </ProfileAuthWrapper>
  );
}
