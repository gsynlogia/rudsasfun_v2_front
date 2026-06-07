/**
 * Layout for client-view contract HTML page
 * Disables default layout to show only pure HTML contract
 */
export default function ClientViewContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}