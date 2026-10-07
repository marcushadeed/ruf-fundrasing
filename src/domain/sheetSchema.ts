import type { TabName } from './types';

/** Column headers for each tab. Order is only a suggestion: the parser matches by name. */
export const HEADERS: Record<TabName, string[]> = {
  Years: ['Year', 'Goal', 'Funds Start'],
  Milestones: ['Label', 'Metric', 'Target', 'Due', 'Kind'],
  Pledges: ['ID', 'Donor', 'Kind', 'Amount', 'Frequency', 'Committed On', 'Expected Date', 'Start', 'End', 'Status', 'Notes'],
  Gifts: ['Date', 'Donor', 'Amount', 'Pledge ID', 'Notes'],
  Pipeline: ['Name', 'Stage', 'Ask Amount', 'Next Step', 'Next Step Date', 'Last Contact', 'Notes'],
  Stages: ['Stage', 'Probability', 'Open?'],
};

// Y2 "Funds Start" is the assumed date Y2 money becomes usable; edit it in the sheet.
export const DEFAULT_YEARS = [
  ['Y1', '$80,000', '2027-10-01'],
  ['Y2', '$80,000', '2028-10-01'],
];

export const DEFAULT_MILESTONES = [
  ['Y1 minimum (75%)', 'y1_pledged', '75%', '2027-09-01', 'minimum'],
  ['Cash on hand', 'received', '$12,000', '2027-09-01', 'minimum'],
  ['Y1 fully pledged', 'y1_pledged', '100%', '2027-10-01', 'goal'],
  ['Y2 fully pledged', 'y2_pledged', '100%', '2028-10-01', 'goal'],
];

export const DEFAULT_STAGES = [
  ['To Ask', '10%', 'yes'],
  ['Asked', '30%', 'yes'],
  ['Meeting Set', '40%', 'yes'],
  ['Considering', '60%', 'yes'],
  ['Pledged', '100%', 'no'],
  ['Declined', '0%', 'no'],
];

export const PLEDGE_KINDS = ['one-time', 'recurring'];
export const FREQUENCY_OPTIONS = ['monthly', 'quarterly', 'annually'];
export const STATUS_OPTIONS = ['active', 'cancelled'];
export const MILESTONE_KINDS = ['minimum', 'goal'];
