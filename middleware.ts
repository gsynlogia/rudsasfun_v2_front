import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/', '/index'], // Zablokuj tylko stronę główną (lub usuń tę linię, by zablokować wszystko)
};

export function middleware(req: NextRequest) {
  // Pobieramy dane logowania wpisane przez użytkownika
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // Dekodujemy login:hasło
    const [user, pwd] = atob(authValue).split(':');

    // TUTAJ USTAW SWÓJ LOGIN I HASŁO
    if (user === 'synlogia' && pwd === '#RAdsVs2@26!') {
      return NextResponse.next();
    }
  }

  // Jeśli brak hasła lub błędne - pokaż okienko logowania przeglądarki
  url.pathname = '/api/auth';
  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Strefa Chroniona"',
    },
  });
}
