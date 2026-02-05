import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drukuj dokument - RADSASfun',
  description: 'Drukowanie dokumentu',
};

/**
 * Layout dla stron druku - całkowicie czysty
 * Renderuje TYLKO formularz dokumentu bez żadnych dodatkowych elementów
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="print-layout bg-white min-h-screen">
      {children}
    </div>
  );
}
