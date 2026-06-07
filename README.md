This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# 🚀 Instrukcja Ręcznego Wdrażania na Vercel (CLI)

Instrukcja służy do bezpiecznego wysyłania kodu z konkretnego brancha (np. FRONT_V2) na konkretny projekt w Vercelu (np. Dev), z pominięciem automatyzacji GitHuba.

## CZĘŚĆ 1: Konfiguracja środowiska (Robisz tylko raz)

Zanim zaczniesz, musisz zainstalować narzędzie Vercel w systemie i się zalogować.

### 1. Instalacja Vercel CLI

Otwórz terminal i wpisz poniższą komendę, aby zainstalować narzędzie globalnie (dla całego systemu).

```bash
sudo npm install -g vercel
```

**Uwaga:** System poprosi Cię o hasło administratora (do Twojego Maca). Podczas wpisywania hasła nie zobaczysz żadnych znaków ani gwiazdek. Po prostu wpisz hasło i naciśnij Enter.

### 2. Logowanie do konta

Połącz terminal ze swoim kontem Vercel.

```bash
vercel login
```

1. Użyj strzałek, aby wybrać **Continue with GitHub**.
2. Naciśnij Enter – otworzy się przeglądarka.
3. Zatwierdź logowanie na stronie. W terminalu zobaczysz komunikat **Success!**.

---

## CZĘŚĆ 2: Procedura Wdrażania (Robisz przy każdej aktualizacji)

Wykonuj te kroki, gdy chcesz zaktualizować stronę developerską (V2).

### Krok 1: Przygotuj kod (Wybór Brancha)

Upewnij się, że jesteś w folderze projektu i masz włączony odpowiedni branch (ten z nową wersją).

```bash
git checkout FRONT_V2
```

### Krok 2: Wyceluj w projekt (Linkowanie)

Ta komenda mówi Vercelowi: "Połącz ten folder na dysku z moim projektem DEV w chmurze".

```bash
vercel link --yes --project rezerwacje_radsas-fun_dev
```

- `--yes`: Pomija pytania i potwierdzenia.
- `--project`: Wskazuje konkretną nazwę projektu w Vercel (dzięki temu nie wyślesz kodu przez pomyłkę na produkcję V1).

### Krok 3: Wyślij na serwer (Deployment)

Ta komenda buduje stronę i aktualizuje domenę przypisaną do tego projektu.

```bash
vercel --prod --yes
```

Poczekaj chwilę, aż zobaczysz komunikat ✅ **Production: https://....**

**Twoja strona Dev jest zaktualizowana!**

---

## ⚠️ Ważna uwaga: Przełączanie między projektami

Pamiętaj, że komenda `vercel link` (Krok 2) zapisuje ustawienia w ukrytym folderze `.vercel` na Twoim dysku.

Jeśli kiedyś wrócisz na branch `main` i będziesz chciał ręcznie zaktualizować stary projekt (V1), musisz zmienić celownik:

```bash
# Tylko w przypadku aktualizacji starego projektu!
git checkout main
vercel link --yes --project NAZWA_STAREGO_PROJEKTU
vercel --prod --yes
```
