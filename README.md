# Cash Compass

Create an internal finance control application for a recruitment and manpower company.

The purpose of this system is to help the finance operations officer personally control, track, and reconcile all money movements.

This is NOT a customer-facing system. It is an internal financial dashboard focused on transparency, accountability, and daily control of cash, cards, candidate money, salaries, and company expenses.

The system must clearly separate:

1. Company money

2. Candidate/sponsor money

3. Housemaid salary money

4. Du Monde factory catering money

5. Personal/company card expenses

====================================================

MAIN DASHBOARD

====================================================

Create a clean financial overview dashboard.

The dashboard should immediately show:

- Total cash available

- Total candidate money currently being held

- Total money in CBQ

- Total money pending transfer to CBQ from company accounts

- Total petty cash available

- Total Du Monde petty cash

- Card balances and amounts needed to close each card

====================================================

CASH POSITION

====================================================

Create two separate petty cash sections.

1. OFFICE PETTY CASH

Track:

- Opening balance

- Cash received

- Payments made

- Current cash balance

Every transaction must include:

- Date

- Description

- Category

- Amount

- Received or Paid

- Related company

- Related candidate (optional)

- Receipt upload

2. DU MONDE PETTY CASH

Separate from office petty cash.

Track:

- Opening balance

- Money added

- Factory expenses

- Current balance

====================================================

COMPANY CARD MANAGEMENT

====================================================

Create a card management module.

Each card must have:

- Card name

- Last 4 digits

- Card limit

- Current balance

- Amount used

- Amount needed to restore limit

- Monthly closing status

----------------------------------------------------

MARYAM CARD

----------------------------------------------------

Card:

****5515

Limit:

5,000 QAR

Purpose:

General company expenses

Track:

- Date

- Expense description

- Category

- Amount

- Company

- Candidate linked (optional)

- Payment proof upload

----------------------------------------------------

YOUSEF CARD

----------------------------------------------------

Card:

****6921

Limit:

5,000 QAR

Purpose:

Immigration-related payments

Track:

- Date

- Candidate name

- Expense type

- Amount

- Receipt upload

Expense types:

- Visa

- Visa cancellation

- QVC

- Medical

- Government payments

- Other

----------------------------------------------------

MAHA PETROL CARD

----------------------------------------------------

Card:

****0552

Limit:

5,000 QAR

Purpose:

Vehicle fuel expenses

Track:

- Driver name

- Vehicle

- Vehicle owner company

- Plate number

- Date

- Petrol station

- Amount

- KM before fuel

- KM after fuel

- ODO number

Create fuel monitoring:

- Distance travelled

- Fuel usage

- Abnormal usage warning

----------------------------------------------------

LIMIT CARD

----------------------------------------------------

Card:

****3852

Limit:

1,000 QAR

This card must also be closed and reconciled monthly.

Create expense branching:

Expense Type:

A. PERSONAL EXPENSE

Fields:

- Date

- Person

- Description

- Amount

- Payment proof

B. COMPANY EXPENSE

Fields:

Company:

- FAST

- Broker

- Skill

- Danet

Details:

- Expense category

- Description

- Amount

- Receipt upload

C. DU MONDE FACTORY CATERING EXPENSE

Fields:

Category:

- Coffee beans

- Milk

- Cups

- Syrups

- Transport

- Equipment

- Other

Details:

- Amount

- Date

- Receipt upload

Dashboard for Limit Card:

Show:

Personal usage:

___ QAR

Company usage:

___ QAR

Factory usage:

___ QAR

Total used:

___ QAR

Remaining:

___ QAR

Amount needed to close card:

___ QAR

====================================================

CANDIDATE MONEY HOLDING SYSTEM

====================================================

Create a module called:

Candidate Financial Holding

Purpose:

Track money received for housemaids/candidates that has not yet been used or cleared.

Example:

Sponsor pays QVC fee of 160 QAR into CBQ.

The money is withdrawn and kept aside until QVC is submitted.

The system must always show where this money currently exists.

Fields:

Candidate name

Passport number

Nationality

Sponsor name

Recruitment company:

- FAST

- Broker

- Skill

- Danet

Money purpose:

- QVC

- Visa

- Medical

- POLO Contract

- Transportation

- Penalty

- Service Charge

- Other

Amount received

Payment method:

- Cash

- CBQ

- Company account

- Card

Current money location:

- Cash in hand

- CBQ

- FAST account

- Broker account

- Skill account

- Danet account

- Card

Status:

- Pending payment

- Paid

- Completed

Example:

Candidate:

Maria Santos

Purpose:

QVC

Amount:

160 QAR

Received:

CBQ

Withdrawn:

Yes

Current location:

Cash in hand

Status:

Pending submission

====================================================

HOUSEMAID SALARY HOLDING SYSTEM

====================================================

Create a separate module:

Returned Housemaid Salary Control

Purpose:

Track salaries received when housemaids return and ensure money is only released after sponsorship transfer.

Fields:

- Housemaid name

- Passport number

- Previous sponsor

- New sponsor

- Salary amount received

- Date received

- Received from

- Current money location

Money location:

- Cash

- CBQ

Status:

- Holding

- Partially released

- Fully released

Create salary release record:

- Release date

- Amount released

- Received by

- New sponsor details

- Transfer confirmation upload

- Signature/proof upload

====================================================

SPONSOR PAYMENT TRACKING

====================================================

Create:

Sponsor Receivables

Track:

- Sponsor name

- Candidate

- Total agreed amount

- Deposit received

- Remaining balance

- Payment date

- Payment method

Example:

Philippines HSW:

Total recruitment amount:

15,000 QAR

Deposit:

7,500 QAR

Balance after arrival:

7,500 QAR

====================================================

COMPANY ACCOUNT TO CBQ TRANSFER CONTROL

====================================================

Create a transfer tracking module.

Company accounts:

- FAST

- Broker

- Skill

- Danet

Track:

- Company

- Amount received

- Purpose

- Amount transferred to CBQ

- Transfer date

- Pending balance

Dashboard:

Show:

"Amount Required to Transfer to CBQ"

====================================================

RECEIPT VOUCHER AND PAYMENT VOUCHER

====================================================

Create digital versions of the current voucher books.

RECEIPT VOUCHER (RV)

Fields:

- Voucher number

- Date

- Company

- Received from

- Candidate/sponsor

- Amount

- Payment method

- Purpose

- Attachment upload

PAYMENT VOUCHER (PV)

Fields:

- Voucher number

- Date

- Company

- Paid to

- Amount

- Payment method

- Purpose

- Candidate linked

- Attachment upload

====================================================

MONTHLY RECONCILIATION

====================================================

Create a monthly closing page.

Show:

- Opening balances

- Total money received

- Total payments made

- Cash balance

- Card balances

- Candidate money held

- Salary money held

- Company expenses

- Du Monde expenses

- Bank transfers

- Difference/variance

====================================================

REPORTS

====================================================

Create downloadable reports:

1. Daily Financial Position Report

2. Candidate Money Holding Report

3. Housemaid Salary Holding Report

4. Card Closing Report

5. Petty Cash Report

6. Monthly Reconciliation Report

7. Company Expense Report

====================================================

DESIGN REQUIREMENTS

====================================================

Design should be:

- Professional

- Clean

- Easy for one person to operate daily

- Similar to a finance dashboard

Use:

- Dashboard cards

- Tables

- Filters

- Search

- Date filters

- Company dropdowns

- Export reports

Important:

Every transaction must have a "Money Location" field showing where the money currently is.

The main goal is to always answer:

"Where is every riyal right now?"

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mafiosa.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e360498f-3587-477c-ba88-ca2cbe4a30a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
