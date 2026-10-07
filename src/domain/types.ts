/** Calendar date as `YYYY-MM-DD`. Compares correctly as a string. */
export type ISODate = string;

export const TAB_NAMES = ['Years', 'Milestones', 'Pledges', 'Gifts', 'Pipeline', 'Stages'] as const;
export type TabName = (typeof TAB_NAMES)[number];

/** Cells exactly as the sheet displays them (formatted strings), header row first. */
export interface RawWorkbook {
  title: string;
  tabs: Partial<Record<TabName, string[][]>>;
}

export interface Year {
  key: string; // e.g. "Y1"
  goal: number;
  /** First day money counts toward this year (money before the next year's start lands here). */
  fundsStart: ISODate;
}

export type Target = { kind: 'amount'; value: number } | { kind: 'percent'; value: number };

export interface Milestone {
  label: string;
  /** `received`, `<year>_pledged` or `<year>_received`, lower-cased, e.g. `y1_pledged`. */
  metric: string;
  target: Target;
  due: ISODate;
  kind: 'minimum' | 'goal';
  row: number;
}

export type Frequency = 'monthly' | 'quarterly' | 'annually';

export interface Pledge {
  id: string;
  donor: string;
  kind: 'one-time' | 'recurring';
  /** Per payment for recurring pledges. */
  amount: number;
  frequency?: Frequency;
  committedOn: ISODate;
  /** One-time: expected payment date. Recurring: first payment date. */
  start: ISODate;
  /** Recurring only; undefined = runs through the end of the last year. */
  end?: ISODate;
  status: 'active' | 'cancelled';
  notes: string;
  row: number;
}

export interface Gift {
  date: ISODate;
  donor: string;
  amount: number;
  pledgeId?: string;
  notes: string;
  row: number;
}

export interface Stage {
  name: string;
  probability: number; // 0..1
  open: boolean;
}

export interface Ask {
  name: string;
  stage: string;
  askAmount: number;
  nextStep: string;
  nextStepDate?: ISODate;
  lastContact?: ISODate;
  notes: string;
  row: number;
}

export interface ParseIssue {
  tab: TabName;
  row: number; // 1-based sheet row; 0 = whole tab
  message: string;
}

export interface Workbook {
  title: string;
  years: Year[];
  milestones: Milestone[];
  pledges: Pledge[];
  gifts: Gift[];
  stages: Stage[];
  asks: Ask[];
  issues: ParseIssue[];
}
