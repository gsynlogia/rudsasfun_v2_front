/**
 * usePermission — hook ACL dla frontendu (defense-in-depth; backend egzekwuje niezależnie).
 *
 * Czyta user.section_levels (mapa {sekcja: poziom 0-50}) z AuthService/localStorage.
 * Backend jest źródłem prawdy — konta z bypassem (superadmin / grupa admin) dostają 50
 * na każdej sekcji już z login response. UI tylko ukrywa/odblokowuje akcje wg poziomu.
 *
 * Fallback (zero regresji): stare sesje bez section_levels (localStorage sprzed ACL) →
 * admin/grupa admin traktowani jak pełny dostęp (jak dotychczas). Po przelogowaniu
 * section_levels się pojawia i poziomy działają precyzyjnie.
 */
import { authService, type User } from "@/lib/services/AuthService";

export const AclLevel = {
  NONE: 0,
  READ: 10,
  WRITE: 20,
  EDIT: 30,
  SOFT_DELETE: 40,
  HARD_DELETE: 50,
} as const;

export type AclLevelValue = (typeof AclLevel)[keyof typeof AclLevel];

export const ACL_LEVEL_LABELS_PL: Record<number, string> = {
  0: "Brak dostępu",
  10: "Odczyt",
  20: "Odczyt + tworzenie",
  30: "Odczyt + tworzenie + edycja",
  40: "+ miękkie kasowanie",
  50: "+ twarde kasowanie",
};

function isLegacyAdminFullAccess(user: User | null): boolean {
  // Stara sesja bez section_levels → admin/grupa admin = pełny dostęp (nie psujemy UI).
  return !!user && (user.user_type === "admin" || (user.groups?.includes("admin") ?? false));
}

// Mapowanie starych nazw sekcji (używanych w UI/SectionGuard) na kanoniczne klucze section_levels.
// Backend zwraca 9 kanonicznych sekcji; frontend miejscami używa historycznych nazw.
const SECTION_ALIASES: Record<string, string> = {
  transports: "transport",
  diets: "catalog",
  promotions: "catalog",
  protections: "catalog",
  sources: "catalog",
  addons: "catalog",
  cms: "documents",
  settings: "system",
};

function normalizeSection(section: string): string {
  return SECTION_ALIASES[section] ?? section;
}

export interface PermissionApi {
  level: (section: string) => number;
  can: (section: string, required: number) => boolean;
  canRead: (section: string) => boolean;
  canWrite: (section: string) => boolean;
  canEdit: (section: string) => boolean;
  canSoftDelete: (section: string) => boolean;
  canHardDelete: (section: string) => boolean;
}

export function computePermissionApi(user: User | null): PermissionApi {
  const levels = user?.section_levels;

  const level = (section: string): number => {
    if (!user) return 0;
    if (!levels) return isLegacyAdminFullAccess(user) ? AclLevel.HARD_DELETE : 0;
    return levels[normalizeSection(section)] ?? 0;
  };
  const can = (section: string, required: number): boolean => level(section) >= required;

  return {
    level,
    can,
    canRead: (s) => can(s, AclLevel.READ),
    canWrite: (s) => can(s, AclLevel.WRITE),
    canEdit: (s) => can(s, AclLevel.EDIT),
    canSoftDelete: (s) => can(s, AclLevel.SOFT_DELETE),
    canHardDelete: (s) => can(s, AclLevel.HARD_DELETE),
  };
}

/** Hook React — zwraca API uprawnień bieżącego użytkownika (z localStorage przez AuthService). */
export function usePermission(): PermissionApi {
  const user = typeof window !== "undefined" ? authService.getCurrentUser() : null;
  return computePermissionApi(user);
}
