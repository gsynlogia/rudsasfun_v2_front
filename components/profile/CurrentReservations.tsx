'use client';

import ReservationCard from './ReservationCard';

/**
 * CurrentReservations Component
 * Main component displaying current reservations list
 */
export default function CurrentReservations() {
  // TODO: Load reservations from API/sessionStorage
  const reservations = [
    {
      id: '1',
      participantName: 'Franciszek Kowalski',
      status: 'Zarezerwowana',
      age: '14 lat',
      gender: 'Mężczyzna / Male',
      city: 'Gdańsk',
      campName: 'Laserowy Paintball',
      dates: '12.07 – 21.07.2022 (10 dni)',
      resort: 'Ośrodek: Beaver',
    },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Aktualne rezerwacje
      </h2>

      <div className="space-y-4 sm:space-y-6">
        {reservations.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} />
        ))}
      </div>
    </div>
  );
}

