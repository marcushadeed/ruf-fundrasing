# RUF Support Dashboard

An interactive dashboard for tracking RUF internship support raising. A Google Sheet is the source of
truth. The dashboard is a static site that reads it with the viewer's Google sign-in (read-only), so
you can share it privately.

```bash
npm install
npm run dev        # then open http://localhost:5173/?demo  (demo data, no sign-in)
```

Hooking it up to your real Sheet and sharing it: **[docs/SETUP.md](docs/SETUP.md)**.

## What it shows

- **Milestones**: progress, countdown, required $/week vs. current pace, status (met / on track / at risk / missed). Confetti the first time one is met.
- **Years**: per-year stacked bars (received → pledged → likely from pipeline), 75% and goal markers, and surplus rolling from Y1 into Y2.
- **Over time**: cumulative pledged and received, with dashed pace projections and milestone targets.
- **As-of scrubber**: see the dashboard as it was on any past date.
- **What-if**: override pipeline conversion, add hypothetical pledges.
- **Ask pipeline**: board and list by stage, weighted "likely" totals, overdue next steps.
- **Pledges / gifts / donors** tables: searchable and sortable.
- **Data issues**: any Sheet row that couldn't be read, with tab and row number.

## Changing goals, dates, and rules

Everything that's "subject to change" lives in the Sheet, not the code:

| Change | Where |
|---|---|
| Goal amounts, when each year's money starts | **Years** tab |
| Deadlines, minimums (e.g. 75% by Sep 1, $12k received) | **Milestones** tab (targets can be `$12,000` or `75%` of that year's goal) |
| Pipeline stages and conversion odds | **Stages** tab |

## How the numbers are calculated

1. **Pledged** = active pledges' scheduled payments + money received on cancelled pledges + gifts not tied to a pledge.
   Gifts tied to a pledge (via **Pledge ID**) aren't double counted.
2. Each dollar goes to the **year its payment date falls in** (before Y2's *Funds Start* → Y1).
   Recurring payments dated in Y2 count toward Y2, since you can't use them in Y1.
3. Anything beyond Y1's goal **rolls into Y2**. Money never moves backward.
4. **Received** = sum of the Gifts tab.
5. **As of** a date: pledges count from their *Committed On* date, gifts from their *Date*.
6. **Pace** = growth over the trailing 60 days; projections at that pace are capped at the goal for all years except the last.
7. **Likely** = open pipeline asks × stage probability, assumed to land in the current year. It's shown separately and never mixed into pledged totals.

## Code layout

```
src/domain/   pure logic + tests: parse.ts, schedule.ts, allocate.ts, metrics.ts, timeline.ts, ledger.ts
src/data/     googleSheets.ts (Sheets API), sample.ts (demo data), source.ts (config)
src/auth/     google.ts (Google Identity Services, read-only token)
src/ui/       React components; styles.css holds the design tokens (light + dark)
scripts/      make-template.ts (generates the Sheet template .xlsx)
```

Scripts: `npm test`, `npm run typecheck`, `npm run build`, `npm run template [-- --with-sample]`.
