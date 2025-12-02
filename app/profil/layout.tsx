import ProfileAuthWrapper from '@/components/ProfileAuthWrapper';
import ProfileLayoutComponent from '@/components/profile/ProfileLayout';

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
