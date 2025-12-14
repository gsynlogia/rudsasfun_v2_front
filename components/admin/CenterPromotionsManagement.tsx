'use client';

import { useState, useEffect } from 'react';

/**
 * Center Promotions Management Component
 * Manages center-specific promotions
 */
export default function CenterPromotionsManagement() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Ładowanie...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Zarządzanie promocjami centrum</h1>
      <p>Funkcjonalność w przygotowaniu...</p>
    </div>
  );
}
