'use client';

import ProfileAuthGuard from './ProfileAuthGuard';

export default function ProfileAuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileAuthGuard>{children}</ProfileAuthGuard>;
}








