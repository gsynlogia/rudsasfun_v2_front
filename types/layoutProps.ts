import { StepNumber } from './stepNumber';
import { CampWithProperty } from './campWithProperty';

export interface LayoutProps {
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  onStepClick?: (step: StepNumber) => void;
  children: React.ReactNode;
  campData?: CampWithProperty;
  isDisabled?: boolean;
}

