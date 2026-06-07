import { computeDocumentStatus } from "@/lib/utils/computeDocumentStatus";

describe("computeDocumentStatus — KARTA", () => {
  test("none — klient nic nie zrobił", () => {
    const r = computeDocumentStatus({ kind: "qualification_card", latestSignedDoc: null });
    expect(r.state).toBe("none");
    expect(r.color).toBe("gray");
    expect(r.primaryAction).toBe("remind");
  });

  test("draft — form_snapshot bez signed_doc (21 rez w lokalnej bazie)", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: null,
      hasFormSnapshot: true,
      formSnapshotUpdatedAt: "2026-04-27T17:53:39",
    });
    expect(r.state).toBe("draft");
    expect(r.color).toBe("amber");
    expect(r.primaryAction).toBe("remind");
    expect(r.message).toContain("wypełnił formularz");
    expect(r.message).toContain("NIE podpisał");
  });

  test("client_started_no_sms — Bug 001 case (REZ-1164)", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: {
        status: "in_verification",
        sms_verified_at: null,
        has_payload: true,
        created_at: "2026-03-12T19:56:00",
      },
    });
    expect(r.state).toBe("client_started_no_sms");
    expect(r.color).toBe("yellow");
    expect(r.primaryAction).toBe("verify_sms");
    expect(r.message).toContain("Podpisz");
    expect(r.message).toContain("NIE wpisał kodu SMS");
  });

  test("client_signed_sms_awaiting_admin — SMS ok, czeka admin", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: {
        status: "in_verification",
        sms_verified_at: "2026-05-15T10:00:00",
        has_payload: true,
      },
    });
    expect(r.state).toBe("client_signed_sms_awaiting_admin");
    expect(r.color).toBe("blue");
    expect(r.primaryAction).toBe("accept_reject");
  });

  test("accepted", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "accepted", sms_verified_at: "2026-05-15", has_payload: true },
    });
    expect(r.state).toBe("accepted");
    expect(r.color).toBe("green");
    expect(r.primaryAction).toBe("view");
  });

  test("rejected — z reason", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "rejected", client_message: "Brak załącznika" },
    });
    expect(r.state).toBe("rejected");
    expect(r.color).toBe("red");
    expect(r.message).toContain("Brak załącznika");
  });

  test("requires_resignature — bez historii (po edycji admina)", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "requires_signature", has_payload: true },
    });
    expect(r.state).toBe("requires_resignature");
    expect(r.color).toBe("purple");
    expect(r.primaryAction).toBe("remind");
    expect(r.badge).toBe("Wymaga ponownego podpisu");
  });

  test("requires_resignature — Z historią accept (REZ-2026-564 case)", () => {
    // REZ-564: 3 dokumenty — 2340 requires_signature (najnowszy), 2207 superseded ale BYŁ accepted+sms_ok
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "requires_signature", has_payload: true },
      previouslyAcceptedAt: "2026-04-25T08:53:37",
    });
    expect(r.state).toBe("requires_resignature");
    expect(r.badge).toBe("Zmieniona po zatwierdzeniu");
    expect(r.message).toContain("BYŁA zatwierdzona");
    expect(r.message).toContain("Klient zmienił dane po akceptacji");
  });

  test("client_started_no_payload — edge case (in_verification bez payload)", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "in_verification", sms_verified_at: null, has_payload: false },
    });
    expect(r.state).toBe("client_started_no_payload");
    expect(r.color).toBe("red");
  });
});

describe("computeDocumentStatus — UMOWA", () => {
  test("none — klient nic nie zrobił", () => {
    const r = computeDocumentStatus({ kind: "contract", latestSignedDoc: null });
    expect(r.state).toBe("none");
    expect(r.color).toBe("gray");
  });

  test("legacy_approved — REZ-2025-* stary system (11 rez w bazie)", () => {
    const r = computeDocumentStatus({
      kind: "contract",
      latestSignedDoc: null,
      legacyContractStatus: "approved",
    });
    expect(r.state).toBe("legacy_approved");
    expect(r.color).toBe("gray");
    expect(r.message).toContain("starym systemie");
    expect(r.primaryAction).toBeNull();
  });

  test("umowa NIE ma stanu 'draft' (nawet z hasFormSnapshot, bo nie ma contract_data)", () => {
    const r = computeDocumentStatus({
      kind: "contract",
      latestSignedDoc: null,
      hasFormSnapshot: true,
    });
    // hasFormSnapshot ignorowany dla umowy → wraca "none"
    expect(r.state).toBe("none");
  });

  test("client_started_no_sms — analogiczny do karty", () => {
    const r = computeDocumentStatus({
      kind: "contract",
      latestSignedDoc: { status: "in_verification", sms_verified_at: null, has_payload: true },
    });
    expect(r.state).toBe("client_started_no_sms");
    expect(r.color).toBe("yellow");
  });

  test("accepted", () => {
    const r = computeDocumentStatus({
      kind: "contract",
      latestSignedDoc: { status: "accepted", sms_verified_at: "2026-05-15", has_payload: true },
    });
    expect(r.state).toBe("accepted");
  });
});

describe("computeDocumentStatus — safe fallbacks", () => {
  test("nieznany status — fallback bez crash", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "weird_status_123" },
    });
    expect(r.state).toBe("none");
    expect(r.color).toBe("gray");
    expect(r.badge).toContain("weird_status_123");
  });

  test("superseded jako najnowszy — bezpieczny fallback", () => {
    const r = computeDocumentStatus({
      kind: "qualification_card",
      latestSignedDoc: { status: "superseded" },
    });
    expect(r.state).toBe("none");
  });
});
