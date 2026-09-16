# 160 Fee Tracker — Phase 1

## Audit result (nothing will be duplicated)

**FOUND EXISTING — will be reused as-is**

| You asked for | Already in the system |
|---|---|
| `clients` table | **Candidates** (43 fields: name, country, passport no., photo, CV, status, sponsor link) |
| `customers` table | **Sponsors** (name, phone, QID, address) |
| `transactions` table | **Master Transactions** — the single money ledger every page already reads from |
| Dashboard | Home dashboard with wallet totals and drill-downs |
| Client file page | Candidate file page (`Recruitment > candidate`) |

**WILL EXTEND (safe, additive — no data touched)**

1. Candidates: add one new field `is_first_time` (yes/no). Nothing renamed, nothing removed.
2. Master Transactions: add two new money locations — **With Staff** and **External Office**. Existing locations (Fast A/C, CBQ, company accounts, cash, Mr Hassan holding wallet) stay exactly as they are and are reused for steps 1–3 and 6.
3. Candidate file page: add the two tracking strips and the red alert banner.
4. Dashboard: add the five new totals.

**WILL CREATE NEW**

- One small table for the 160-fee document status per candidate (paid / submitted / in review / approved / rejected / resubmission), with submitted date, auto expected date (+7 days), rejection reason and attempt number. Nothing equivalent exists today.

Nothing is deleted, reset or renamed. All changes use "add only if missing".

## The 160 fee flow

Money is never created or destroyed — each step only moves it to a new place, and every step writes one line into the existing Master Transactions ledger.

1. Paid by sponsor — pick Fast A/C, CBQ, Company Account or Cash → +160 there
2. Money sits in that account (balance shown)
3. Button "Transfer to Wallet" → moves to Mr Hassan holding wallet
4. Button "Received from Wallet" → moves to With Staff
5. Button "Paid to Office" → 160 leaves as an expense to External Office
6. Button "Returned (rejected)" → 160 comes back into the holding wallet, ready to reuse

## Red alert

If step 5 is recorded while step 4 was never recorded, the candidate file shows a red banner: "Paid office without receiving from wallet! Collect 160" and stays red until step 4 is recorded. The dashboard gets a red "To Collect From Wallet" widget summing every such case, and each one is clickable through to the candidate.

## Candidate file view

- **Money strip:** Paid → Account → Wallet → Received → Paid Office → Returned
- **Document strip:** Paid → Submitted (with date and auto expected date) → In Review → Approved / Rejected, with a "Resubmit" action that loops back and counts attempts

Green tick = done, blue = current, grey = not yet, red = alert or rejected. Mobile-friendly, white rounded cards, same look as the rest of the app.

## Dashboard widgets

Total in Fast A/C · Total in Holding Wallet · To Collect From Wallet (red) · At External Office · Returned — plus search of the candidate list by name, passport or sponsor, with a chip showing where each candidate's 160 currently sits.

## Test data

I will add one test candidate "Maria S" with sponsor "Ahmed" so you can click the whole flow end to end. It is clearly marked and can be removed with one click.

## Technical notes

- Migration is additive only: `alter table public.candidates add column if not exists is_first_time boolean default false`; `create table if not exists public.polo_contracts (...)` with GRANTs, RLS and owner-scoped policies matching the existing tables.
- New `WalletKey` values `with-staff` and `external-office` added to `src/lib/finance-types.ts`; the six steps are recorded as Master Transactions rows (`Transfer` / `Payment Voucher`), so vouchers, reports and reconciliation pick them up automatically.
- Step state and the red alert are **derived** from ledger rows (no static balance columns), consistent with the existing candidate-holdings ledger approach.
