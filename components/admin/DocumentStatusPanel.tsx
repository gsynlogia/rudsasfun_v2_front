"use client";

import React from "react";
import {
  computeDocumentStatus,
  type DocumentKind,
  type DocumentColor,
  type DocumentStateKey,
  type SignedDocLite,
} from "@/lib/utils/computeDocumentStatus";

/**
 * Unified panel statusu dokumentu (karta lub umowa) dla admin UI.
 * Zastępuje 6+ rozproszonych miejsc komunikatu jednym spójnym komponentem.
 * Obsługuje wszystkie 7 stanów karty / 6 stanów umowy.
 */

const COLOR_CLASSES: Record<
  DocumentColor,
  { bg: string; border: string; text: string; badgeBg: string; badgeText: string }
> = {
  gray: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-700",
    badgeBg: "bg-gray-200",
    badgeText: "text-gray-800",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-900",
    badgeBg: "bg-amber-200",
    badgeText: "text-amber-900",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    text: "text-yellow-900",
    badgeBg: "bg-yellow-200",
    badgeText: "text-yellow-900",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-900",
    badgeBg: "bg-blue-200",
    badgeText: "text-blue-900",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-900",
    badgeBg: "bg-purple-200",
    badgeText: "text-purple-900",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-900",
    badgeBg: "bg-emerald-200",
    badgeText: "text-emerald-900",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-900",
    badgeBg: "bg-red-200",
    badgeText: "text-red-900",
  },
};

export interface DocumentStatusPanelProps {
  kind: DocumentKind;
  latestSignedDoc: SignedDocLite | null;
  hasFormSnapshot?: boolean;
  formSnapshotUpdatedAt?: string | null;
  legacyContractStatus?: string | null;
  previouslyAcceptedAt?: string | null;
  /** Optional callback dla auto-test: pozwala stronie zareagować na klik akcji. */
  onAction?: (action: string) => void;
}

export default function DocumentStatusPanel({
  kind,
  latestSignedDoc,
  hasFormSnapshot,
  formSnapshotUpdatedAt,
  legacyContractStatus,
  previouslyAcceptedAt,
}: DocumentStatusPanelProps) {
  const status = computeDocumentStatus({
    kind,
    latestSignedDoc,
    hasFormSnapshot,
    formSnapshotUpdatedAt,
    legacyContractStatus,
    previouslyAcceptedAt,
  });
  const c = COLOR_CLASSES[status.color];

  return (
    <div
      data-testid={`doc-status-${kind}`}
      data-state={status.state}
      data-prev-accepted={previouslyAcceptedAt || "null"}
      className={`${c.bg} border-l-4 ${c.border} px-4 py-3 rounded-r-none rounded-l-none my-2`}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-none ${c.badgeBg} ${c.badgeText} text-xs font-bold uppercase tracking-wide`}
          title={status.state}
        >
          <span aria-hidden="true">{status.icon}</span>
          <span>{status.badge}</span>
        </span>
      </div>
      <p className={`mt-2 text-sm ${c.text} leading-relaxed`}>{status.message}</p>
    </div>
  );
}

/** Helper dla typu — exportujemy z modułu na potrzeby testów. */
export type { DocumentStateKey };
