'use client';

import { useState } from 'react';
import ReservationMain from './ReservationMain';
import ReservationSidebar from './ReservationSidebar';

interface Reservation {
  id: string;
  participantName: string;
  status: string;
  age: string;
  gender: string;
  city: string;
  campName: string;
  dates: string;
  resort: string;
}

interface ReservationCardProps {
  reservation: Reservation;
}

/**
 * ReservationCard Component
 * Container for reservation details with main content and sidebar
 */
export default function ReservationCard({ reservation }: ReservationCardProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const toggleDetails = () => {
    setIsDetailsExpanded(!isDetailsExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Main Content */}
        <div className="flex-1 p-3 sm:p-4 md:p-6">
          <ReservationMain 
            reservation={reservation} 
            isDetailsExpanded={isDetailsExpanded}
            onToggleDetails={toggleDetails}
          />
        </div>
        
        {/* Right: Sidebar */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 p-3 sm:p-4 md:p-6 bg-gray-50">
          <ReservationSidebar 
            reservationId={reservation.id}
            isDetailsExpanded={isDetailsExpanded}
          />
        </div>
      </div>
    </div>
  );
}

