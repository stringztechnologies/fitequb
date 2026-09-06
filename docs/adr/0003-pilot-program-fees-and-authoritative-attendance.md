# Separate paid pilot services from the stake pot

The approved pilot charges a program fee and stake in one checkout. Extend the ADR-0001/0002 ledger vocabulary with `program_fee`, `program_refund`, and `payment_refund`, linked to an immutable payment-intent allocation. Keep the unique provider reference on the stake entry and link both receipt components through `payment_intent_ref`. Service revenue never participates in Equb settlement or forfeiture-based trainer commissions; verified unapplied receipts are refund obligations, not memberships.

Pilot qualification comes from room-specific, staff-approved attendance, not general verification points or a mutable completion counter. SQL enforces the same boundary as the API. This deliberately prevents the existing daily-reset and manual-workout paths from awarding paid pilot credit. Corrections have an audit trail; unresolved disputes block settlement.

Production v1 stores room dates as DATE and stakes/pots as INTEGER. The forward migration interprets legacy dates as Addis Ababa midnight and converts monetary columns to decimal ETB, preserving historical dates and enabling exact-cent settlement. Existing ADRs remain applicable to legacy products; pilot settings are frozen after first paid enrollment.
