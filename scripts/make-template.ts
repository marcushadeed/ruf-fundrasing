/**
 * Generates the Google Sheet template as .xlsx (upload to Drive -> Open with Google Sheets).
 *   npm run template                 -> template/RUF-Funding-Template.xlsx (config tabs filled, data tabs empty)
 *   npm run template -- --with-sample -> template/RUF-Funding-Sample.xlsx (demo data, for trying things out)
 */
import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';
import { sampleWorkbook } from '../src/data/sample';
import {
  FREQUENCY_OPTIONS,
  HEADERS,
  MILESTONE_KINDS,
  PLEDGE_KINDS,
  STATUS_OPTIONS,
} from '../src/domain/sheetSchema';
import { TAB_NAMES, type TabName } from '../src/domain/types';

const withSample = process.argv.includes('--with-sample');
const ROWS = 500; // rows that get dropdowns/formatting

const DATE_FMT = 'yyyy-mm-dd';
const MONEY_FMT = '"$"#,##0';
const PCT_FMT = '0%';

const DATE_COLS = new Set(['Funds Start', 'Due', 'Committed On', 'Expected Date', 'Start', 'End', 'Date', 'Next Step Date', 'Last Contact']);
const MONEY_COLS = new Set(['Goal', 'Amount', 'Ask Amount']);

const list = (values: string[]) => ({ type: 'list' as const, allowBlank: true, formulae: [`"${values.join(',')}"`] });
const range = (ref: string) => ({ type: 'list' as const, allowBlank: true, formulae: [ref] });

/** Dropdowns per tab/column. Warnings (not hard errors) so new values can still be typed. */
const VALIDATIONS: Partial<Record<TabName, Record<string, ReturnType<typeof list>>>> = {
  Milestones: {
    Metric: list(['received', 'y1_pledged', 'y2_pledged', 'y1_received', 'y2_received']),
    Kind: list(MILESTONE_KINDS),
  },
  Pledges: { Kind: list(PLEDGE_KINDS), Frequency: list(FREQUENCY_OPTIONS), Status: list(STATUS_OPTIONS) },
  Gifts: { 'Pledge ID': range('Pledges!$A$2:$A$1000') },
  Pipeline: { Stage: range('Stages!$A$2:$A$50') },
  Stages: { 'Open?': list(['yes', 'no']) },
};

const HELP = [
  ['RUF Support Dashboard — how this Sheet works'],
  [''],
  ['The dashboard reads these tabs by name and columns by header text. Keep tab names and headers; column order and extra columns are fine.'],
  [''],
  ['Years', 'One row per internship year. Goal = amount needed. Funds Start = first day money counts toward that year (money before Y2 starts funds Y1; Y1 surplus rolls into Y2).'],
  ['Milestones', 'Deadlines to track. Metric: received, y1_pledged, y2_pledged (or y1_received...). Target: an amount ($12,000) or % of that year\'s goal (75%).'],
  ['Pledges', 'Commitments. one-time: Amount + Expected Date. recurring: Amount per payment + Frequency + Start (+ End; blank = through the last year). Status cancelled = only money already received counts.'],
  ['Gifts', 'Money actually received. Set Pledge ID when it pays a pledge (so it is not double counted). Leave blank for an unpledged gift: it counts as both pledged and received.'],
  ['Pipeline', 'People you plan to ask / have asked. Stage must match the Stages tab. Once someone pledges, add a row to Pledges and move them to "Pledged".'],
  ['Stages', 'Pipeline stages and how likely each is to convert. Open? = no means the stage is finished (Pledged, Declined) and not counted as "likely".'],
  [''],
  ['Data problems (bad dates, unknown stages, etc.) show up at the top of the dashboard with the tab and row number.'],
];

/** "$1,200" -> number, "75%" -> fraction, "2027-09-01" -> Date; anything else stays text. */
function toCell(value: string): string | number | Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (/^\$[\d,]+(\.\d+)?$/.test(value)) return Number(value.replace(/[$,]/g, ''));
  if (/^\d+(\.\d+)?%$/.test(value)) return Number(value.slice(0, -1)) / 100;
  return value;
}

async function main() {
  const raw = sampleWorkbook();
  const book = new ExcelJS.Workbook();

  const help = book.addWorksheet('How to use');
  help.addRows(HELP);
  help.getRow(1).font = { bold: true, size: 14 };
  help.getColumn(1).width = 14;
  help.getColumn(2).width = 140;
  help.getColumn(1).font = { bold: true };

  for (const tab of TAB_NAMES) {
    const ws = book.addWorksheet(tab, { views: [{ state: 'frozen', ySplit: 1 }] });
    const headers = HEADERS[tab];
    ws.addRow(headers).font = { bold: true };

    const isConfig = tab === 'Years' || tab === 'Milestones' || tab === 'Stages';
    const body = withSample || isConfig ? (raw.tabs[tab] ?? []).slice(1) : [];
    for (const r of body) ws.addRow(r.map(toCell));

    headers.forEach((h, i) => {
      const col = ws.getColumn(i + 1);
      col.width = Math.max(12, h.length + 4, h === 'Notes' || h === 'Donor' || h === 'Name' ? 28 : 0);
      if (DATE_COLS.has(h)) col.numFmt = DATE_FMT;
      if (MONEY_COLS.has(h)) col.numFmt = MONEY_FMT;
      if (h === 'Probability') col.numFmt = PCT_FMT;
      const validation = VALIDATIONS[tab]?.[h];
      if (validation) {
        for (let r = 2; r <= ROWS; r++) {
          ws.getCell(r, i + 1).dataValidation = { ...validation, showErrorMessage: true, errorStyle: 'warning' };
        }
      }
    });
    // Milestone targets mix $ and %: format per cell.
    if (tab === 'Milestones') {
      const t = headers.indexOf('Target') + 1;
      ws.getColumn(t).eachCell((cell, row) => {
        if (row > 1 && typeof cell.value === 'number') cell.numFmt = cell.value <= 1 ? PCT_FMT : MONEY_FMT;
      });
    }
  }

  mkdirSync('template', { recursive: true });
  const out = withSample ? 'template/RUF-Funding-Sample.xlsx' : 'template/RUF-Funding-Template.xlsx';
  await book.xlsx.writeFile(out);
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
