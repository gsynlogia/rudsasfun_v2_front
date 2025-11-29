import { redirect } from 'next/navigation';

/**
 * Home Page Component
 * Redirects to default camp edition step 1
 * Route: / -> /camps/1/edition/1/step/1
 * 
 * This is a dynamic route - marked as such to prevent static generation errors
 */
export const dynamic = 'force-dynamic';

export default function Home() {
  // Redirect to default camp edition (camp 1, edition 1, step 1)
  // In production, you might want to fetch the latest/active camp edition
  redirect('/camps/1/edition/1/step/1');
}
