import { addDays, addMonths, todayISO } from '../domain/dates';
import { DEFAULT_MILESTONES, DEFAULT_STAGES, DEFAULT_YEARS, HEADERS } from '../domain/sheetSchema';
import type { ISODate, RawWorkbook } from '../domain/types';

/**
 * Realistic-looking demo data, dated relative to `today` so the demo always
 * looks "in progress". Also used by the template script (--with-sample).
 */
export function sampleWorkbook(today: ISODate = todayISO()): RawWorkbook {
  const d = (offset: number) => addDays(today, offset);
  const nextMonth = addMonths(today, 1).slice(0, 8) + '01';

  // ID, Donor, Kind, Amount, Frequency, Committed On, Expected Date, Start, End, Status, Notes
  const pledges = [
    ['P001', 'Smith Family', 'one-time', '$5,000', '', d(-58), d(-50), '', '', 'active', 'Home church friends'],
    ['P002', 'Grace PCA Missions Committee', 'one-time', '$10,000', '', d(-41), '2027-06-01', '', '', 'active', 'Paid after budget vote'],
    ['P003', 'Johnson, Mark & Amy', 'one-time', '$1,200', '', d(-36), d(-30), '', '', 'active', ''],
    ['P004', 'Lee, Daniel', 'one-time', '$2,500', '', d(-22), d(30), '', '', 'active', ''],
    ['P005', 'Garcia, Sofia', 'recurring', '$100', 'monthly', d(-15), '', nextMonth, '2029-09-01', 'active', 'Both years'],
    ['P006', 'Chen Family', 'one-time', '$3,000', '', d(-9), d(20), '', '', 'active', ''],
    ['P007', 'Williams, Tom', 'one-time', '$2,000', '', d(-55), d(-45), '', '', 'cancelled', 'Job change; gave $500'],
    ['P008', 'Brown, Rachel', 'one-time', '$750', '', d(-4), d(10), '', '', 'active', ''],
    ['P009', 'First Church Deacons', 'one-time', '$8,000', '', d(-2), '2027-08-15', '', '', 'active', ''],
    ['P010', 'Patel, Ravi', 'one-time', '$1,500', '', d(-62), d(-55), '', '', 'active', ''],
    ['P011', 'Okafor Family', 'recurring', '$1,000', 'annually', d(-12), '', '2028-11-01', '2029-11-01', 'active', 'Year 2 only'],
  ];

  // Date, Donor, Amount, Pledge ID, Notes
  const gifts = [
    [d(-55), 'Patel, Ravi', '$1,500', 'P010', ''],
    [d(-50), 'Smith Family', '$5,000', 'P001', ''],
    [d(-44), 'Williams, Tom', '$500', 'P007', ''],
    [d(-29), 'Johnson, Mark & Amy', '$1,200', 'P003', ''],
    [d(-12), 'Anonymous', '$250', '', 'Cash at support night'],
    [d(-6), 'Nguyen, Linh', '$400', '', 'Unsolicited'],
  ];

  // Name, Stage, Ask Amount, Next Step, Next Step Date, Last Contact, Notes
  const pipeline = [
    ['Aunt Carol', 'To Ask', '$2,000', 'Call', d(3), '', ''],
    ['Pastor Mike', 'To Ask', '$5,000', 'Request church missions slot', d(14), '', ''],
    ['College roommate (Jake)', 'To Ask', '$600', 'Text', d(-2), '', 'Overdue'],
    ['Thompson Family', 'Asked', '$3,000', 'Follow-up email', d(5), d(-8), ''],
    ['Rivera, Ana', 'Asked', '$1,200', 'Follow-up call', d(-1), d(-15), ''],
    ['Westside PCA', 'Meeting Set', '$12,000', 'Present to session', d(21), d(-3), ''],
    ['Kim, David & Sarah', 'Meeting Set', '$4,000', 'Coffee', d(9), d(-5), ''],
    ['Martin, George', 'Considering', '$6,000', 'Check in', d(7), d(-6), 'Very interested'],
    ['Hughes Family', 'Considering', '$2,400', 'Send RUF brochure', d(2), d(-10), ''],
    ['Smith Family', 'Pledged', '$5,000', '', '', d(-58), ''],
    ['Lee, Daniel', 'Pledged', '$2,500', '', '', d(-22), ''],
    ['Baker, Ron', 'Declined', '$1,000', '', '', d(-30), 'Maybe next year'],
  ];

  return {
    title: 'Demo data',
    tabs: {
      Years: [HEADERS.Years, ...DEFAULT_YEARS],
      Milestones: [HEADERS.Milestones, ...DEFAULT_MILESTONES],
      Pledges: [HEADERS.Pledges, ...pledges],
      Gifts: [HEADERS.Gifts, ...gifts],
      Pipeline: [HEADERS.Pipeline, ...pipeline],
      Stages: [HEADERS.Stages, ...DEFAULT_STAGES],
    },
  };
}
