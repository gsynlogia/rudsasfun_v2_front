'use client';

import { useEffect, useState } from 'react';
import { authService, User } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';
import { useToast } from '@/components/ToastContainer';
import { Lock, Mail } from 'lucide-react';

export default function MyAccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const hasPassword = user?.has_password === true;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await authService.verifyToken();
        if (!cancelled) setUser(u ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openForm = () => {
    setFormError(null);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setConfirmOpen(false);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!newPassword || newPassword.length < 6) {
      setFormError('Nowe hasło musi mieć co najmniej 6 znaków.');
      return false;
    }
    if (newPassword !== newPasswordConfirm) {
      setFormError('Nowe hasło i powtórzenie muszą być identyczne.');
      return false;
    }
    if (hasPassword && !currentPassword?.trim()) {
      setFormError('Podaj obecne hasło.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const openConfirm = () => {
    if (!validateForm()) return;
    setConfirmOpen(true);
  };

  const submitPassword = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const body: {
        new_password: string;
        new_password_confirm: string;
        current_password?: string;
      } = {
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      };
      if (hasPassword) body.current_password = currentPassword;

      const res = await fetch(`${API_BASE_URL}/api/auth/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError((data.detail as string) || 'Nie udało się zapisać hasła.');
        setSubmitting(false);
        return;
      }

      closeForm();
      const updated = await authService.verifyToken();
      setUser(updated ?? null);
      showSuccess('Hasło zostało zapisane.');
    } catch {
      setFormError('Wystąpił błąd połączenia.');
      showError('Nie udało się zapisać hasła.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Moje konto
        </h2>
        <p className="text-sm text-gray-600">Ładowanie…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Moje konto
        </h2>
        <p className="text-sm text-gray-600">Nie jesteś zalogowany.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Moje konto
      </h2>

      <div className="space-y-4 max-w-xl">
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200">
          <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">E-mail / Login</p>
            <p className="font-medium text-gray-900">{user.email ?? user.login}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200">
          <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Hasło</p>
            <p className="font-medium text-gray-900">
              {hasPassword
                ? 'Hasło ustawione. Możesz logować się e-mailem i hasłem.'
                : 'Brak hasła – ustaw hasło, aby móc logować się e-mailem i hasłem.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="px-4 py-2 text-sm font-medium text-white border transition-colors hover:opacity-90"
            style={{ backgroundColor: '#00a8e8', borderColor: '#00a8e8' }}
          >
            {hasPassword ? 'Zmień hasło' : 'Ustaw hasło'}
          </button>
        </div>
      </div>

      {/* Modal: formularz hasła */}
      {formOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
          onClick={closeForm}
        >
          <div
            className="bg-white shadow-2xl max-w-md w-full p-6"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {hasPassword ? 'Zmień hasło' : 'Ustaw hasło'}
            </h3>
            {formError && (
              <p className="text-sm text-red-600 mb-3" role="alert">
                {formError}
              </p>
            )}
            {hasPassword && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obecne hasło
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-gray-900"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nowe hasło (min. 6 znaków)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-gray-900"
                autoComplete="new-password"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Powtórz nowe hasło
              </label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-gray-900"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={openConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border-2 border-gray-800 hover:bg-gray-700"
              >
                Dalej
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: potwierdzenie */}
      {confirmOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60] p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <div
            className="bg-white shadow-2xl max-w-md w-full p-6"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Czy na pewno chcesz zmienić hasło?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Po zapisaniu będziesz mógł logować się nowym hasłem.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={submitPassword}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border-2 border-gray-800 hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? 'Zapisywanie…' : 'Tak, zmień hasło'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
