'use client';

import HeaderTop from './HeaderTop';
import HeaderSecondary from './HeaderSecondary';

/**
 * Header Component
 * Combines HeaderTop and HeaderSecondary
 * Used in reservation process - shows both bars
 * For admin panel, use HeaderTop directly
 */
export default function Header() {
  return (
    <>
      <HeaderTop />
      <HeaderSecondary />
    </>
  );
}

