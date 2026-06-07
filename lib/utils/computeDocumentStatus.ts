/**
 * Pure function — oblicza stan dokumentu (karta / umowa) dla unified UX.
 * Wynik mapuje WSZYSTKIE 12 faktycznych kombinacji z bazy na 7 (karta) / 6 (umowa)
 * stanów UX, każdy z własnym kolorem, komunikatem i sugerowaną akcją.
 *
 * Sygnał wiarygodny "klient zapisał vs podpisał" (Bug 004 / 6 agentów konsensus):
 *  - istnienie `latestSignedDoc` = klient kliknął "Podpisz dokument"
 *  - tylko `formSnapshot` (bez signedDoc) = klient kliknął "Zapisz zmiany"
 *  - `signedAt` w form_snapshot NIE jest sygnałem (zawsze ustawiane w getPayload())
 */

export type DocumentKind = "qualification_card" | "contract";

export type DocumentStateKey =
  | "none" // klient nic nie zrobił
  | "draft" // form_snapshot bez signed_doc (tylko karta)
  | "client_started_no_sms" // signed_doc in_verification, payload OK, brak SMS
  | "client_started_no_payload" // signed_doc in_verification, brak payload (edge case)
  | "client_signed_sms_awaiting_admin" // signed_doc in_verification, SMS OK
  | "requires_resignature" // signed_doc requires_signature (po edycji admina)
  | "accepted" // signed_doc accepted
  | "rejected" // signed_doc rejected
  | "legacy_approved"; // brak signed_doc ale contract_status='approved' (stary system)

export type DocumentColor = "gray" | "amber" | "yellow" | "blue" | "purple" | "green" | "red";

export interface SignedDocLite {
  status: string;
  sms_verified_at?: string | null;
  has_payload?: boolean;
  client_message?: string | null;
  created_at?: string | null;
  reverted_after_approval?: number | null;
}

export interface ComputeDocumentStatusInput {
  kind: DocumentKind;
  latestSignedDoc: SignedDocLite | null;
  /** Form snapshot draft (tylko dla karty — umowa nie ma draftu). */
  hasFormSnapshot?: boolean;
  formSnapshotUpdatedAt?: string | null;
  /** Dla legacy umów REZ-2025-* (contract_status='approved' bez signed_doc). */
  legacyContractStatus?: string | null;
  /** Czy istnieje wcześniejszy dokument z statusem 'accepted' lub superseded z sms_verified_at
   *  (czyli historycznie podpisany SMS-em + zaakceptowany przed bieżącą wersją).
   *  Sygnał dla stanu requires_signature: admin powinien wiedzieć czy klient zmienił JUŻ ZAAKCEPTOWANY dokument. */
  previouslyAcceptedAt?: string | null;
}

export interface DocumentStatusResult {
  state: DocumentStateKey;
  /** Krótki badge (max 25 znaków). */
  badge: string;
  /** Pełen tekst (po ludzku, dla admina). */
  message: string;
  /** Kolor wizualny. */
  color: DocumentColor;
  /** Ikona (emoji lub nazwa lucide-react). */
  icon: string;
  /** Sugerowana akcja (przycisk wyróżniony). null = brak akcji. */
  primaryAction: "remind" | "verify_sms" | "force_accept" | "accept_reject" | "view" | "resend_for_signature" | null;
}

export function computeDocumentStatus(input: ComputeDocumentStatusInput): DocumentStatusResult {
  const { kind, latestSignedDoc, hasFormSnapshot, formSnapshotUpdatedAt, legacyContractStatus, previouslyAcceptedAt } = input;
  const kindLabel = kind === "qualification_card" ? "Karta kwalifikacyjna" : "Umowa";

  // 1. Brak signed_doc → 3 warianty
  if (!latestSignedDoc) {
    // Legacy umowa REZ-2025-* zatwierdzona bez signed_doc
    if (kind === "contract" && legacyContractStatus === "approved") {
      return {
        state: "legacy_approved",
        badge: "Zatwierdzona (legacy)",
        message:
          "Umowa zatwierdzona w starym systemie (przed wdrożeniem podpisu SMS). Brak oficjalnego podpisanego dokumentu w nowym systemie.",
        color: "gray",
        icon: "📦",
        primaryAction: null,
      };
    }
    // Draft (tylko karta — umowa nie ma draftu)
    if (kind === "qualification_card" && hasFormSnapshot) {
      const when = formSnapshotUpdatedAt
        ? ` (ostatnia edycja: ${formatDateTime(formSnapshotUpdatedAt)})`
        : "";
      return {
        state: "draft",
        badge: "Draft bez podpisu",
        message: `Klient wypełnił formularz karty${when}, ale NIE podpisał SMS-em — w bazie brak oficjalnego podpisanego dokumentu. Wyślij przypomnienie o podpisaniu.`,
        color: "amber",
        icon: "⚠",
        primaryAction: "remind",
      };
    }
    // Klient nic nie zrobił
    return {
      state: "none",
      badge: "Brak",
      message:
        kind === "qualification_card"
          ? "Klient jeszcze nie wypełnił karty kwalifikacyjnej. Wyślij przypomnienie o wypełnieniu."
          : "Klient jeszcze nie podpisał umowy. Wyślij przypomnienie o podpisaniu.",
      color: "gray",
      icon: "—",
      primaryAction: "remind",
    };
  }

  // 2. signed_doc istnieje — analiza statusu
  const s = latestSignedDoc.status;
  const smsOk = !!latestSignedDoc.sms_verified_at;
  const hasPayload = !!latestSignedDoc.has_payload;

  if (s === "accepted") {
    return {
      state: "accepted",
      badge: "Zatwierdzona",
      message: `${kindLabel} podpisana SMS-em przez klienta i zaakceptowana przez admina.`,
      color: "green",
      icon: "✓",
      primaryAction: "view",
    };
  }

  if (s === "rejected") {
    const reason = latestSignedDoc.client_message ? ` Powód: ${latestSignedDoc.client_message}` : "";
    return {
      state: "rejected",
      badge: "Odrzucona",
      message: `${kindLabel} została odrzucona przez admina.${reason} Wyślij przypomnienie o poprawkach.`,
      color: "red",
      icon: "✗",
      primaryAction: "remind",
    };
  }

  if (s === "requires_signature") {
    const previousAcceptInfo = previouslyAcceptedAt
      ? ` Poprzednia wersja BYŁA zatwierdzona ${formatDateTime(previouslyAcceptedAt)} i jest dostępna w historii (sekcja "Wersje dokumentów" → status "Zastąpiona"). Klient zmienił dane po akceptacji.`
      : "";
    return {
      state: "requires_resignature",
      badge: previouslyAcceptedAt ? "Zmieniona po zatwierdzeniu" : "Wymaga ponownego podpisu",
      message: `${kindLabel} została zmodyfikowana${previouslyAcceptedAt ? " po zatwierdzeniu" : ""}.${previousAcceptInfo} Klient musi podpisać SMS-em ponownie nową wersję. Wyślij przypomnienie.`,
      color: "purple",
      icon: "⟳",
      primaryAction: "remind",
    };
  }

  if (s === "in_verification") {
    if (!hasPayload) {
      return {
        state: "client_started_no_payload",
        badge: "Brak treści dokumentu",
        message: `${kindLabel} ma status "w weryfikacji" ale brak treści w bazie (edge case — historyczny dokument lub błąd flow). Wyślij przypomnienie o ponownym wypełnieniu.`,
        color: "red",
        icon: "⚠",
        primaryAction: "remind",
      };
    }
    if (!smsOk) {
      const when = latestSignedDoc.created_at ? ` (wysłany ${formatDateTime(latestSignedDoc.created_at)})` : "";
      return {
        state: "client_started_no_sms",
        badge: "Czeka na SMS klienta",
        message: `Klient kliknął "Podpisz"${when}, ale NIE wpisał kodu SMS. Zweryfikuj kod telefonicznie LUB zaakceptuj bez SMS (force-accept) LUB wyślij przypomnienie.`,
        color: "yellow",
        icon: "📩",
        primaryAction: "verify_sms",
      };
    }
    // SMS OK, czeka admin
    return {
      state: "client_signed_sms_awaiting_admin",
      badge: "Podpisana SMS — czeka admin",
      message: `Klient podpisał ${kindLabel.toLowerCase()} SMS-em${
        latestSignedDoc.sms_verified_at ? ` (${formatDateTime(latestSignedDoc.sms_verified_at)})` : ""
      }. Wymagana akcja admina: zaakceptuj lub odrzuć.`,
      color: "blue",
      icon: "✓",
      primaryAction: "accept_reject",
    };
  }

  if (s === "superseded") {
    // Najnowszy doc jest superseded → ta sytuacja nie powinna się zdarzyć (najnowszy ID powinien być active)
    // ale zabezpiecznie:
    return {
      state: "none",
      badge: "Brak aktywnego dokumentu",
      message: `${kindLabel} ma najnowszy dokument w stanie zastąpionym. Sprawdź historię — prawdopodobnie potrzebne wysłanie do ponownego podpisu.`,
      color: "gray",
      icon: "—",
      primaryAction: "remind",
    };
  }

  // Nieznany status — bezpieczny fallback
  return {
    state: "none",
    badge: `Nieznany status: ${s}`,
    message: `${kindLabel}: nieznany status dokumentu "${s}". Sprawdź historię.`,
    color: "gray",
    icon: "?",
    primaryAction: null,
  };
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
