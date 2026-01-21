import { StepNumber } from './stepNumber';

export interface StepNavigationProps {
  onStepClick?: (step: StepNumber) => void;
}