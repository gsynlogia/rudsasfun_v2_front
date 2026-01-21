'use client';

/**
 * TestBanner Component
 * Displays a banner above the top bar informing users about testing phase
 */
export default function TestBanner() {
  return (
    <div className="bg-yellow-400 text-gray-900 py-2 px-4 text-center text-sm sm:text-base font-medium">
      <span>Jesteśmy w trakcie testów. </span>
      <a
        href="/kontakt"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-blue-800 font-semibold"
      >
        Prosimy o wysyłanie wiadomości korzystając z tego formularza
      </a>
    </div>
  );
}