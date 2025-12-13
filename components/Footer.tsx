import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12 sm:mt-16">
      <div className="max-w-container mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Logo and Social Media Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4 sm:mb-6">
              <Image
                src="/logo.png"
                alt="Radsas Fun Logo"
                width={150}
                height={60}
                className="h-auto max-h-[60px] w-auto"
                style={{ maxHeight: '60px', height: 'auto' }}
              />
            </div>
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Znajdziesz nas na:</p>
              <div className="flex gap-2 sm:gap-3">
                <a
                  href="#"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#03adf0] transition-colors group"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#03adf0] transition-colors group"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#03adf0] transition-colors group"
                  aria-label="YouTube"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Oferta Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Oferta</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Obozy i kolonie letnie
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Wycieczki szkolne
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Wyjazdy rodzinne
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Obozy zimowe
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Wyjazdy dla seniorów
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Imprezy integracyjne
                </Link>
              </li>
            </ul>
          </div>

          {/* Przydatne linki Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Przydatne linki</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Fotorelacja
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  O nas
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Kadra
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Ośrodki
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Sklep
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Moje konto
                </Link>
              </li>
            </ul>
          </div>

          {/* Informacje Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Informacje</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Pracuj z nami
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Gwarancja jakości
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Pytania i odpowiedzi
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Regulamin Usług Turystycznych i Ubezpieczeń
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Polityka prywatności i RODO
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-gray-600 hover:text-[#03adf0] transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Rating Section */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Ocena: 4,8/5</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Realizacja:{' '}
            <a
              href="https://synlogia.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#03adf0] hover:underline"
            >
              Global Synlogia
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
