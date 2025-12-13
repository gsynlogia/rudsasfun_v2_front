import { StepNumber } from './stepNumber';

export interface Step {
  number: StepNumber;
  label: string;
  active: boolean;
  completed: boolean;
}

