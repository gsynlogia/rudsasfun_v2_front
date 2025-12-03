import Downloads from '@/components/profile/Downloads';

/**
 * Downloads Page
 * Displays all downloadable documents except invoices
 */
export default function DownloadsPage() {
  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Do pobrania
      </h2>
      <Downloads />
    </div>
  );
}

