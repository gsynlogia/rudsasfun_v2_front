'use client';

/**
 * Reużywalny dolny pasek paginacji (strony, „X z Y”, pole strona + Enter).
 * Nie jest częścią tabeli – można go używać w innych widokach.
 * Umieszczany jako ostatni element w layoucie flex (flex-shrink-0), żeby był zawsze widoczny u dołu.
 */
export interface TablePaginationBarProps {
  /** Tekst np. "płatności" / "rezerwacji" */
  itemLabel?: string;
  /** Łączna liczba rekordów */
  total: number;
  /** Liczba na stronie */
  itemsPerPage: number;
  /** Aktualna strona (1-based) */
  currentPage: number;
  /** Łączna liczba stron */
  totalPages: number;
  /** Callback zmiany strony */
  onPageChange: (page: number) => void;
  /** Wartość pola input „numer strony” (kontrolowana) */
  pageInputValue: string;
  /** Zmiana wartości inputu */
  onPageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Enter w polu strony */
  onPageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function TablePaginationBar({
  itemLabel = 'płatności',
  total,
  itemsPerPage,
  currentPage,
  totalPages,
  onPageChange,
  pageInputValue,
  onPageInputChange,
  onPageInputKeyDown,
}: TablePaginationBarProps) {
  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, total);

  if (totalPages < 2) {
    return (
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Wyświetlanie {from} - {to} z {total} {itemLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Wyświetlanie {from} - {to} z {total} {itemLabel}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            Poprzednia
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm font-medium transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-[#03adf0] text-white border border-[#03adf0]'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="px-2 text-gray-500">...</span>;
            }
            return null;
          })}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            Następna
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pageInputValue}
            onChange={onPageInputChange}
            onKeyDown={onPageInputKeyDown}
            placeholder={`1-${totalPages}`}
            className="w-16 px-2 py-1 text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#03adf0] transition-all duration-200 text-center"
            style={{ borderRadius: 0 }}
          />
          <span className="text-xs text-gray-500">(Enter)</span>
        </div>
      </div>
    </div>
  );
}