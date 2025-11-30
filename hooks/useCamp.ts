'use client';

import { useState, useEffect } from 'react';
import { getCurrentCamp, type Camp } from '@/utils/api';

interface UseCampReturn {
  camp: Camp | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage current camp data
 */
export function useCamp(): UseCampReturn {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCamp = async () => {
    try {
      setLoading(true);
      setError(null);
      const campData = await getCurrentCamp();
      setCamp(campData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch camp data');
      console.error('Error fetching camp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamp();
  }, []);

  return {
    camp,
    loading,
    error,
    refetch: fetchCamp,
  };
}


