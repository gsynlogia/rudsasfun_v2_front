'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useToast } from '@/components/ToastContainer';
import { getApiBaseUrl } from '@/utils/api-config';

/**
 * Contact Form Page
 * Allows users to send messages during testing phase
 */
export default function ContactPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      showError('Proszę wypełnić wszystkie pola');
      return;
    }

    if (!email.trim()) {
      showError('Adres e-mail jest wymagany.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError('Proszę podać prawidłowy adres e-mail.');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const _data = await response.json();

      showSuccess('Dziękujemy za wiadomość! Otrzymaliśmy Twoją wiadomość i odpowiemy wkrótce.');

      // Reset form
      setSubject('');
      setMessage('');
      setEmail('');

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error sending contact message:', error);
      showError(error.message || 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <Header />
      <main className="max-w-container mx-auto px-3 sm:px-6 py-4 sm:py-8" style={{ overflow: 'visible', position: 'relative' }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
            Formularz kontaktowy
          </h1>

          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Jesteśmy w trakcie testów. Jeśli napotkasz jakikolwiek problem lub masz pytania,
            prosimy o wypełnienie poniższego formularza. Odpowiemy najszybciej jak to możliwe.
          </p>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Temat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent outline-none text-sm sm:text-base"
                placeholder="Np. Problem z rezerwacją, pytanie o obóz..."
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Opis problemu <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={8}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent outline-none text-sm sm:text-base resize-y"
                placeholder="Opisz szczegółowo problem lub zadaj pytanie..."
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres e-mail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent outline-none text-sm sm:text-base"
                placeholder="twoj@email.pl"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#03adf0] hover:bg-[#0288c7] text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmitting ? 'Wysyłanie...' : 'Wyślij'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}