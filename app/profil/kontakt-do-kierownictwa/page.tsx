/**
 * Contact Management Page
 * Informacja kierująca po numery telefonów do kierowników na stronę radsas-fun.pl.
 * Numery publikowane są dopiero w dniu rozpoczęcia turnusu — panel nie trzyma ich u siebie,
 * tylko odsyła na stronę (zgłoszenie Joanny, 2026-07-17).
 */
export default function ContactPage() {
  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Kontakt do kierownictwa
      </h2>
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <p className="text-sm sm:text-base text-gray-700">
          Numery telefonów do kierowników pojawią się w dniu rozpoczęcia się kolonii na stronie:{' '}
          <a
            href="https://radsas-fun.pl/kontakt-do-kierownikow-na-obozach-letnich/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#03adf0] font-medium hover:text-[#0288c7] hover:underline"
          >
            Kontakt do kierowników na obozach letnich
          </a>
        </p>
      </div>
    </div>
  );
}
