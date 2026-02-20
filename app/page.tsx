import { redirect } from 'next/navigation';

const HOME_REDIRECT_URL = 'https://radsas-fun.pl/kategoria-produktu/obozy-i-kolonie-dla-dzieci-i-mlodziezy/';

/**
 * Strona główna (/) – przekierowanie na katalog obozów na stronie radsas-fun.pl
 * Route: /
 */
export const dynamic = 'force-dynamic';

export default function Home() {
  redirect(HOME_REDIRECT_URL);
}