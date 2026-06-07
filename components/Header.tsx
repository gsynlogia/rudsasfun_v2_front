'use client';

import HeaderSecondary from './HeaderSecondary';
import HeaderTop from './HeaderTop';

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