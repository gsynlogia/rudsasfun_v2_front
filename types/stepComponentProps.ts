import { StepNumber } from './stepNumber';

export interface StepComponentProps {
  onNext?: () => void;
  onPrevious?: () => void;
  disabled?: boolean;
  currentStep?: StepNumber;
}