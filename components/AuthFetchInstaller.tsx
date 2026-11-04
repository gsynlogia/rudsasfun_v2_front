'use client';

import { installAuthFetch } from '@/lib/utils/installAuthFetch';

// Instalacja przy wczytaniu modułu, żeby objąć też zapytania z pierwszych efektów strony.
if (typeof window !== 'undefined') {
  installAuthFetch();
}

export default function AuthFetchInstaller() {
  return null;
}
