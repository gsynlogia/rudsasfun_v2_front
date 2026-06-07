import ReservationAuthWrapper from '@/components/ReservationAuthWrapper';

export default function CampsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReservationAuthWrapper>{children}</ReservationAuthWrapper>;
}