/**
 * Layout for client-view qualification card HTML page
 * Disables default layout to show only pure HTML qualification card
 */
export default function ClientViewQualificationCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}