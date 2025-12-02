'use client';

import ReservationCard from './ReservationCard';

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

/**
 * ReservationHistory Component
 * Displays completed/past reservations
 */
export default function ReservationHistory() {
  // TODO: Load reservations from API/sessionStorage
  const reservations: Reservation[] = [
    {
      id: '3',
      participantName: 'Anna Nowak',
      status: 'Zakończona',
      age: '15 lat',
      gender: 'Kobieta / Female',
      city: 'Kraków',
      campName: 'Obozowy Paintball',
      dates: '01.07 – 10.07.2022 (9 dni)',
      resort: 'Ośrodek: Mountain View',
    },
    {
      id: '4',
      participantName: 'Jan Kowalski',
      status: 'Zakończona',
      age: '13 lat',
      gender: 'Mężczyzna / Male',
      city: 'Wrocław',
      campName: 'Laserowy Paintball',
      dates: '15.06 – 24.06.2022 (9 dni)',
      resort: 'Ośrodek: Beaver',
    },
    {
      id: '5',
      participantName: 'Maria Wiśniewska',
      status: 'Zakończona',
      age: '11 lat',
      gender: 'Kobieta / Female',
      city: 'Poznań',
      campName: 'Obozowy Paintball',
      dates: '20.05 – 29.05.2022 (9 dni)',
      resort: 'Ośrodek: Mountain View',
    },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Historia rezerwacji
      </h2>

      <div className="space-y-4 sm:space-y-6">
        {reservations.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} />
        ))}
      </div>
    </div>
  );
}



