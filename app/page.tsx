import CampsList from '@/components/CampsList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Home Page Component
 * Displays list of camps with their editions (turnusy) for selection
 * Route: /
 * 
 * This is a dynamic route - marked as such to prevent static generation errors
 */
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-4xl">
        <CampsList />
      </main>
      <Footer />
    </div>
  );
}
