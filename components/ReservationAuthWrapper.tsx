'use client';

import ReservationAuthGuard from './ReservationAuthGuard';

export default function ReservationAuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReservationAuthGuard>{children}</ReservationAuthGuard>;
}








