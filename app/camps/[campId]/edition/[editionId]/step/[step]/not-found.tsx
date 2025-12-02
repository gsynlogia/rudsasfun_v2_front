import Link from 'next/link';

/**
 * Not Found Page for Camp Edition
 * Displayed when camp or edition does not exist
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto px-4 py-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Nie znaleziono obozu lub edycji
        </h1>
        
        <p className="text-lg text-gray-600 mb-2">
          Przepraszamy, ale żądany obóz lub edycja nie istnieje.
        </p>
        
        <p className="text-sm text-gray-500 mb-8">
          Sprawdź, czy adres URL jest poprawny lub wybierz inny obóz z listy dostępnych.
        </p>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-[#03adf0] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors"
          >
            Powrót do strony głównej
          </Link>
        </div>
      </div>
    </div>
  );
}





