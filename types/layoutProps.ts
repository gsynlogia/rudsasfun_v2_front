import { CampWithProperty } from './campWithProperty';
import { StepNumber } from './stepNumber';

export interface LayoutProps {
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  onStepClick?: (step: StepNumber) => void;
  children: React.ReactNode;
  campData?: CampWithProperty;
  isDisabled?: boolean;
}