'use client';

import { Edit, Trash2 } from 'lucide-react';
import type { Camp, CampProperty } from '@/types/reservation';

interface CampWithProperties extends Camp {
  properties: CampProperty[];
}

interface CampListProps {
  camps: CampWithProperties[];
  onSelectCamp: (camp: CampWithProperties) => void;
  onEditCamp: (camp: Camp) => void;
  onDeleteCamp: (campId: number) => void;
}

/**
 * Camp List Component
 * Displays all camps with their properties in a table format
 */
export default function CampList({
  camps,
  onSelectCamp,
  onEditCamp,
  onDeleteCamp,
}: CampListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  if (camps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Brak obozów. Dodaj pierwszy obóz, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {camps.map((camp) => (
        <div key={camp.id} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Camp Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#03adf0] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{camp.id}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{camp.name}</h3>
                  <p className="text-sm text-gray-500">
                    {camp.properties?.length || 0} {camp.properties?.length === 1 ? 'edycja' : 'edycji'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectCamp(camp)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-[#03adf0] hover:bg-[#0288c7] rounded-lg transition-colors"
                  title="Zarządzaj edycjami"
                  style={{ cursor: 'pointer' }}
                >
                  Zarządzaj edycjami
                </button>
                <button
                  onClick={() => onEditCamp(camp)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edytuj obóz"
                  style={{ cursor: 'pointer' }}
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edytuj</span>
                </button>
                <button
                  onClick={() => onDeleteCamp(camp.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Usuń obóz"
                  style={{ cursor: 'pointer' }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Usuń</span>
                </button>
              </div>
            </div>
          </div>

          {/* Properties Summary */}
          {camp.properties && camp.properties.length > 0 ? (
            <div className="px-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {camp.properties.slice(0, 3).map((property) => (
                  <div key={property.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getPeriodLabel(property.period)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{property.city}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(property.start_date)} - {formatDate(property.end_date)}
                    </p>
                  </div>
                ))}
                {camp.properties.length > 3 && (
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      +{camp.properties.length - 3} więcej
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              <p>Brak edycji dla tego obozu. Kliknij "Zarządzaj edycjami", aby dodać pierwszą edycję.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

