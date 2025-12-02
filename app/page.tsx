import CampsList from '@/components/CampsList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Home Page Component
 * Displays list of camps with their editions (turnusy) for selection
 * Route: /
 * 
 * This is a dynamic route - marked as such to prevent static generation errors
 * Uses the same layout structure as reservation pages for consistency
 */
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <Header />
      <main className="max-w-container mx-auto px-3 sm:px-6 py-4 sm:py-8" style={{ overflow: 'visible', position: 'relative' }}>
        <CampsList />
      </main>
      <Footer />
    </div>
  );
}
