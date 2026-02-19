'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

type PanelMode = 'closed' | 'notifications' | 'document';

export type DocumentContentType = ReactNode | (() => ReactNode);

interface AdminRightPanelContextType {
  panelMode: PanelMode;
  documentTitle: string;
  documentContent: DocumentContentType | null;
  openNotifications: () => void;
  openDocument: (content: DocumentContentType, title: string, onClose?: () => void) => void;
  close: () => void;
}

const AdminRightPanelContext = createContext<AdminRightPanelContextType | undefined>(undefined);

export function AdminRightPanelProvider({ children }: { children: ReactNode }) {
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState<DocumentContentType | null>(null);
  const onDocumentCloseRef = useRef<(() => void) | null>(null);

  const openNotifications = useCallback(() => {
    setDocumentTitle('');
    setDocumentContent(null);
    onDocumentCloseRef.current = null;
    setPanelMode('notifications');
  }, []);

  const openDocument = useCallback((content: DocumentContentType, title: string, onClose?: () => void) => {
    setDocumentTitle(title);
    setDocumentContent(content);
    onDocumentCloseRef.current = onClose ?? null;
    setPanelMode('document');
  }, []);

  const close = useCallback(() => {
    onDocumentCloseRef.current?.();
    onDocumentCloseRef.current = null;
    setPanelMode('closed');
    setDocumentTitle('');
    setDocumentContent(null);
  }, []);

  return (
    <AdminRightPanelContext.Provider
      value={{
        panelMode,
        documentTitle,
        documentContent,
        openNotifications,
        openDocument,
        close,
      }}
    >
      {children}
    </AdminRightPanelContext.Provider>
  );
}

export function useAdminRightPanel() {
  const ctx = useContext(AdminRightPanelContext);
  if (ctx === undefined) {
    throw new Error('useAdminRightPanel must be used within AdminRightPanelProvider');
  }
  return ctx;
}