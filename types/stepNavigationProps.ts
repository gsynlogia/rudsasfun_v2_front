import { StepNumber } from './stepNumber';

export interface StepNavigationProps {
  currentStep: StepNumber;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onStepClick: (step: StepNumber) => void;
}

