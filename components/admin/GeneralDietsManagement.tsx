'use client';

import { useState, useEffect } from 'react';

/**
 * General Diets Management Component
 * Manages general diets
 */
export default function GeneralDietsManagement() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Ładowanie...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Zarządzanie dietami ogólnymi</h1>
      <p>Funkcjonalność w przygotowaniu...</p>
    </div>
  );
}
