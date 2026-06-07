import Link from 'next/link';
import { notFound } from 'next/navigation';

import LayoutClient from '@/components/LayoutClient';
import Step1 from '@/components/Step1';
import Step2 from '@/components/Step2';
import Step3 from '@/components/Step3';
import Step4 from '@/components/Step4';
import Step5 from '@/components/Step5';
import type { StepNumber, CampWithProperty } from '@/types/reservation';
import { getCampEdition } from '@/utils/api-server';

interface PageProps {
  params: Promise<{
    campId: string;
    editionId: string;
    step: string;
  }>;
}

/**
 * Dynamic route page for reservation steps
 * Route: /camps/[campId]/edition/[editionId]/step/[step]
 *
 * Fetches camp data on server side before rendering to avoid hydration errors
 * This is a Server Component - data is fetched before mount
 */
export default async function ReservationStepPage({ params }: PageProps) {
  const { campId, editionId, step } = await params;

  // Validate step number
  const stepNumber = parseInt(step, 10);
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
    notFound();
  }

  // Validate campId and editionId
  const parsedCampId = parseInt(campId, 10);
  const parsedEditionId = parseInt(editionId, 10);

  if (isNaN(parsedCampId) || parsedCampId < 1) {
    console.error('[ReservationStepPage] Invalid camp ID:', campId);
    notFound();
  }

  if (isNaN(parsedEditionId) || parsedEditionId < 1) {
    console.error('[ReservationStepPage] Invalid edition ID:', editionId);
    notFound();
  }

  // Fetch camp data on server side (before mount - prevents hydration errors)
  // Max 10 seconds timeout
  let campData: CampWithProperty;
  try {
    campData = await getCampEdition(parsedCampId, parsedEditionId);

    // Check if camp/edition exists (id = 0 means doesn't exist)
    // This is NOT an error - just information that resource doesn't exist
    if (!campData || !campData.camp || !campData.property) {
      // Return empty data - will be handled by LayoutClient
      campData = {
        camp: {
          id: 0,
          name: '',
          created_at: null,
          updated_at: null,
          properties: null,
        },
        property: {
          id: 0,
          camp_id: 0,
          period: '',
          city: '',
          start_date: '1970-01-01',
          end_date: '1970-01-01',
          days_count: 0,
          max_participants: 0,
          created_at: null,
          updated_at: null,
        },
      };
    } else if (campData.camp.id === 0 || campData.property.id === 0) {
      // Camp or edition doesn't exist - this is OK, not an error
      // Keep the data as is - LayoutClient will handle displaying message
    } else {
      // Verify IDs match for existing data
      if (campData.camp.id !== parsedCampId ||
          campData.property.id !== parsedEditionId ||
          campData.property.camp_id !== parsedCampId) {
        // IDs don't match - treat as not found (not an error)
        campData = {
          camp: {
            id: 0,
            name: '',
            created_at: null,
            updated_at: null,
            properties: null,
          },
          property: {
            id: 0,
            camp_id: 0,
            period: '',
            city: '',
            start_date: '1970-01-01',
            end_date: '1970-01-01',
            days_count: 0,
            max_participants: 0,
            created_at: null,
            updated_at: null,
          },
        };
      }
    }
  } catch (error) {
    // Only actual errors (timeout, server errors) should throw
    // Missing camp/edition is NOT an error
    console.error('[ReservationStepPage] Error fetching camp data:', error);
    throw error;
  }

  // Check if turnus is full or ended (only if camp and property exist)
  const isTurnusFull = campData?.property?.is_full === true;
  const isTurnusEnded = campData?.property?.is_ended === true;
  const isTurnusUnavailable = isTurnusFull || isTurnusEnded;

  // Calculate completed steps (all previous steps)
  const completedSteps: StepNumber[] = [];
  for (let i = 1; i < stepNumber; i++) {
    completedSteps.push(i as StepNumber);
  }

  const currentStep = stepNumber as StepNumber;

  const renderStep = () => {
    const stepProps = {
      onNext: undefined,
      onPrevious: undefined,
    };

    // Use pathname as key to force remount when navigating between steps
    // This ensures sessionStorage data is loaded correctly
    const stepKey = `${campId}-${editionId}-${currentStep}`;

    switch (currentStep) {
      case 1:
        return <Step1 key={stepKey} {...stepProps} />;
      case 2:
        return <Step2 key={stepKey} {...stepProps} />;
      case 3:
        return <Step3 key={stepKey} {...stepProps} />;
      case 4:
        return <Step4 key={stepKey} {...stepProps} />;
      case 5:
        return <Step5 key={stepKey} {...stepProps} />;
      default:
        return <Step1 key={stepKey} {...stepProps} />;
    }
  };

  return (
    <LayoutClient
      currentStep={currentStep}
      completedSteps={completedSteps}
      campData={campData}
      isDisabled={isTurnusUnavailable || campData?.camp?.id === 0 || campData?.property?.id === 0}
    >
      {isTurnusUnavailable && campData?.camp?.id !== 0 && campData?.property?.id !== 0 ? (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-red-800 mb-2">
              {isTurnusFull ? 'Turnus wyprzedany' : 'Turnus zakończony'}
            </h2>
            <p className="text-red-700 mb-4">
              {isTurnusFull
                ? 'Przepraszamy, wszystkie miejsca na ten turnus zostały zarezerwowane.'
                : 'Przepraszamy, ten turnus się już zakończył. Nie można dokonać rezerwacji.'}
            </p>
            {campData?.property?.registered_count !== undefined && campData?.property?.max_participants !== undefined && (
              <p className="text-sm text-red-600">
                Zarejestrowanych uczestników: {campData.property.registered_count}/{campData.property.max_participants}
              </p>
            )}
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Powrót do listy obozów
            </Link>
          </div>
        </div>
      ) : (
        renderStep()
      )}
    </LayoutClient>
  );
}