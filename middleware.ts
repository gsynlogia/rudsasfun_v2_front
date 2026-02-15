import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/', '/index'], // Zablokuj tylko stronę główną (lub usuń tę linię, by zablokować wszystko)
};

export function middleware(req: NextRequest) {
  // Gdy NEXT_PUBLIC_DEV_MODE=false (np. produkcja) – nie wymagaj loginu i hasła
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    return NextResponse.next();
  }

  // NEXT_PUBLIC_DEV_MODE=true: wymagane Basic Auth (login i hasło)
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');
    // token: hYu5fu7Ii7DNNYEhKCHxhla2RmY7Kq6oFCEqVoLA

    if (user === 'synlogia' && pwd === '#RAdsVs2@26!') {
      return NextResponse.next();
    }
  }

  url.pathname = '/api/auth';
  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Strefa Chroniona"',
    },
  });
}