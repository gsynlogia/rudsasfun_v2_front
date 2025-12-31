/**
 * Layout for contract HTML page
 * Disables default layout to show only pure HTML contract
 */
export default function ContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



