import { NextRequest, NextResponse } from 'next/server';

// Na produkcji nie używamy Basic Auth – cała logika wyłączona (zakomentowana)
// export const config = {
//   matcher: ['/', '/index'],
// };

export function middleware(_req: NextRequest) {
  return NextResponse.next();
  // --- poniżej zakomentowane: Basic Auth (login/hasło) na czas produkcji ---
  // if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
  //   return NextResponse.next();
  // }
  // const basicAuth = req.headers.get('authorization');
  // const url = req.nextUrl;
  // if (basicAuth) {
  //   const authValue = basicAuth.split(' ')[1];
  //   const [user, pwd] = atob(authValue).split(':');
  //   if (user === 'synlogia' && pwd === '#RAdsVs2@26!') {
  //     return NextResponse.next();
  //   }
  // }
  // url.pathname = '/api/auth';
  // return new NextResponse('Auth Required.', {
  //   status: 401,
  //   headers: {
  //     'WWW-Authenticate': 'Basic realm="Strefa Chroniona"',
  //   },
  // });
}