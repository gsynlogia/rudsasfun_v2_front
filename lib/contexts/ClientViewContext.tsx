'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ClientViewInfo {
  userId: number;
  userName: string | null;
  userEmail: string | null;
}

interface ClientViewContextType {
  viewedUser: ClientViewInfo | null;
  setViewedUser: (user: ClientViewInfo | null) => void;
  isClientViewMode: boolean;
}

const ClientViewContext = createContext<ClientViewContextType | undefined>(undefined);

export function ClientViewProvider({
  children,
  initialUserId,
  initialUserName,
  initialUserEmail,
}: {
  children: ReactNode;
  initialUserId?: number;
  initialUserName?: string | null;
  initialUserEmail?: string | null;
}) {
  const [viewedUser, setViewedUser] = useState<ClientViewInfo | null>(
    initialUserId
      ? {
          userId: initialUserId,
          userName: initialUserName || null,
          userEmail: initialUserEmail || null,
        }
      : null
  );

  const isClientViewMode = viewedUser !== null;

  return (
    <ClientViewContext.Provider value={{ viewedUser, setViewedUser, isClientViewMode }}>
      {children}
    </ClientViewContext.Provider>
  );
}

export function useClientView() {
  const context = useContext(ClientViewContext);
  if (context === undefined) {
    throw new Error('useClientView must be used within a ClientViewProvider');
  }
  return context;
}
