import Image from 'next/image';

/**
 * Maintenance Page Component
 * Displays when portal is offline for maintenance
 */
export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4" style={{ overflow: 'visible', position: 'relative' }}>
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Radsas Fun Logo"
            width={150}
            height={60}
            className="h-auto max-h-[60px] w-auto"
            style={{ maxHeight: '60px', height: 'auto' }}
            priority
          />
        </div>

        {/* Maintenance Message */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Trwa aktualizacja serwisu
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">
            Zapraszamy później
          </p>
        </div>
      </div>
    </div>
  );
}






