# Roadmap — Housemaid recruitment flow

## Profession-specific CV skills
- [ ] Read original CV skills and employment details for professions other than HOUSEMAID/DRIVER
- [ ] Allow review/editing and show source-based summaries in CV previews and prints
- [ ] Test profession rules and verify the upload flow without changing existing records

## POLO corrections and transfer controls
- [x] Edit scanned worker names after saving, without changing recruitment or finance names
- [x] Add confirmed unsigned bulk deletion and history-preserving signed bulk reversal (approved)
- [x] Correct FAST office name in both languages, keeping the existing map pin
- [x] Test safeguards in isolated database tests and verify signed-in controls without changing live money

## FAST public website
- [x] Apply black-and-white styling without changing Broker
- [x] Enlarge FAST logo and reuse ERP FAST CV header
- [x] Verify public pages, CV preview/print, and mobile layout

## Broker language and header
- [x] Enlarge company name and add mobile-visible English/Arabic toggle
- [x] Translate public Broker pages and enable remembered RTL Arabic
- [x] Verify language switching, persistence, and desktop/mobile layout

## Stage 1 (done)
- [x] Migration: sponsors, pipeline fields on candidates, status history, expense tags on transactions
- [x] Sponsors directory (name confirmation, QID unique)
- [x] Pipeline statuses per nationality (PH / others / TZ) with history
- [x] Per-housemaid expense folder in the master ledger (Paid by, settlement, running total)
- [x] Name confirmation + passport duplicate check on CV entry
- [x] Module permission + officer role presets

## Stage 2 (done)
- [x] Requests table + Official Requests admin page (approve/reject, red flags, notifications)
- [x] Auto requests: AGENT_REMITTANCE_1 at VISA_READY_TO_PRINT, OEC_PAYMENT_REQUEST at OEC, DISCOUNT_REQUEST

## Stage 3 (done)
- [x] Agent remittance module (agency vs agent, half payments, payment history)

## CV administration (done)
- [x] Unique country-based CV serial codes and safe re-sequencing
- [x] Finish admin CV editing controls and code display
- [x] Rename CV Management to Recruitment and fit letterheads to CV width
