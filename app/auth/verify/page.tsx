'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { magicLinkService } from '@/lib/services/MagicLinkService';
import { authService } from '@/lib/services/AuthService';
import HeaderTop from '@/components/HeaderTop';
import Footer from '@/components/Footer';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Weryfikowanie magic link...');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Brak tokenu weryfikacyjnego');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        const response = await magicLinkService.verifyMagicLink(token);
        
        // Store authentication - USER MUST BE LOGGED IN even if redirect fails
        authService.storeMagicLinkAuth(response.access_token, response.user);
        
        setStatus('success');
        setMessage('Logowanie zakończone sukcesem! Przekierowywanie...');
        
        // Get redirect URL from API response (stored in database)
        const redirectUrl = response.redirect_url;
        
        // Redirect to saved URL if valid, otherwise go to home page
        // User is already logged in at this point
        const finalRedirect = redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/') 
          ? redirectUrl 
          : '/';
        
        setTimeout(() => {
          router.push(finalRedirect);
        }, 1500);
      } catch (err) {
        // Even if verification fails, don't prevent login if token is valid
        // But show error and redirect to login
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Błąd podczas weryfikacji magic link');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <HeaderTop />
      
      <main className="max-w-container mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
                <p className="text-sm sm:text-base text-gray-600">Weryfikowanie magic link...</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="inline-block w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm sm:text-base text-green-800 font-medium">Logowanie zakończone sukcesem!</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="inline-block w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm sm:text-base text-red-800 font-medium mb-4">Błąd podczas weryfikacji magic link</p>
                <p className="text-xs text-gray-500">Przekierowywanie do strony logowania...</p>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <p className="text-sm text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

