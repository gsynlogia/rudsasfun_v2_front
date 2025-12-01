'use client';

import { useState } from 'react';

interface Notification {
  id: string;
  date: string;
  message: string;
  read: boolean;
}

/**
 * NotificationsStrip Component
 * Displays notifications at the top of profile pages
 */
export default function NotificationsStrip() {
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      date: '10.05.2023',
      message: 'Umowa została dodana – dziękujemy. Oczekuje na weryfikację. Poinformujemy Cię o jej wyniku.',
      read: false,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    // TODO: Implement mark as read functionality
    console.log('Mark as read:', id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 sm:mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
          Powiadomienia
        </h2>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white text-[10px] sm:text-xs font-semibold">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-2 sm:space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-2">{notification.date}</p>
              <p className="text-xs sm:text-sm text-gray-700">{notification.message}</p>
            </div>
            <button
              onClick={() => handleMarkAsRead(notification.id)}
              className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors whitespace-nowrap"
            >
              zapoznałem się
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

