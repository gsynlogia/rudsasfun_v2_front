/**
 * Transport from Cities Page
 * Informacja kierująca po szczegóły transportu na stronę radsas-fun.pl.
 */
export default function TransportPage() {
  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Transport z miast
      </h2>
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <p className="text-sm sm:text-base text-gray-700">
          {/* Karta 41 (Trello): poprawny link kierujący do szczegółów transportu na obozy. */}
          Szczegóły transportu z miast (rozkład, miejsca zbiórki, ceny) znajdziesz na naszej stronie:{' '}
          <a
            href="https://radsas-fun.pl/transporty/transport-na-obozy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#03adf0] font-medium hover:text-[#0288c7] hover:underline"
          >
            radsas-fun.pl/transporty/transport-na-obozy
          </a>
        </p>
      </div>
    </div>
  );
}