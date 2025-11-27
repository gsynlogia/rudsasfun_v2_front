'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import Step1 from '@/components/Step1';
import Step2 from '@/components/Step2';
import Step3 from '@/components/Step3';
import Step4 from '@/components/Step4';
import Step5 from '@/components/Step5';
import type { StepNumber } from '@/types/reservation';

/**
 * Home Page Component
 * Main entry point for the reservation system with step management
 */
export default function Home() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [completedSteps, setCompletedSteps] = useState<StepNumber[]>([]);


  // Auto-complete previous steps when moving forward
  const handleStepChange = (newStep: StepNumber) => {
    setCurrentStep(newStep);
    // Mark all previous steps as completed
    const newCompletedSteps: StepNumber[] = [];
    for (let i = 1; i < newStep; i++) {
      newCompletedSteps.push(i as StepNumber);
    }
    setCompletedSteps(newCompletedSteps);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 onNext={() => handleStepChange(2)} onPrevious={() => handleStepChange(1)} />;
      case 2:
        return <Step2 onNext={() => handleStepChange(3)} onPrevious={() => handleStepChange(1)} />;
      case 3:
        return <Step3 onNext={() => handleStepChange(4)} onPrevious={() => handleStepChange(2)} />;
      case 4:
        return <Step4 onNext={() => handleStepChange(5)} onPrevious={() => handleStepChange(3)} />;
      case 5:
        return <Step5 onNext={() => {}} onPrevious={() => handleStepChange(4)} />;
      default:
        return <Step1 onNext={() => handleStepChange(2)} onPrevious={() => handleStepChange(1)} />;
    }
  };

  return (
    <Layout
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={handleStepChange}
    >
      {renderStep()}
    </Layout>
  );
}
