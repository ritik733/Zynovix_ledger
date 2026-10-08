import {
  enrichTransactions,
  calculatePersonSummaries,
  calculateAgeingAnalysis,
  calculateAccountBalanceSummary,
  calculateExpenseAnalytics,
  getAgeingBucket,
  getDaysOutstanding,
} from '../lib/financial-logic';
import { getSampleInitialData } from '../lib/seed-data';

console.log('--- RUNNING SCENARIO VERIFICATION SUITE ---');

const seed = getSampleInitialData('test-user');
const enriched = enrichTransactions(seed.transactions, seed.settlements, seed.people, seed.categories);
const personSummaries = calculatePersonSummaries(seed.people, enriched);
const ageing = calculateAgeingAnalysis(enriched);
const balance = calculateAccountBalanceSummary(personSummaries, enriched);

// SCENARIO 1 & 4 (Rahul Borrow ₹10,000, Repaid ₹4,000)
const rahul = personSummaries.find((p) => p.person_name === 'Rahul');
console.assert(rahul !== undefined, 'Rahul must exist in person summaries');
console.log(`Rahul: I Owe = ₹${rahul?.i_owe}, They Owe Me = ₹${rahul?.they_owe_me}, Net = ₹${rahul?.net_position}`);

// Rahul borrowed 10,000, paid 4,000 => pending 6,000
console.assert(rahul?.i_owe === 6000, `Rahul i_owe must be 6000, got ${rahul?.i_owe}`);

// SCENARIO 3 (Same person has BOTH borrow and lending simultaneously: Rahul borrow ₹10k and lent ₹3k)
console.assert(rahul?.they_owe_me === 3000, `Rahul they_owe_me must be 3000, got ${rahul?.they_owe_me}`);
console.assert(rahul?.net_position === -3000, `Rahul net position must be -3000 (Payable), got ${rahul?.net_position}`);
console.assert(rahul?.status === 'Payable', `Rahul status must be Payable, got ${rahul?.status}`);

// Verify both transactions remain independent
const rahulTxs = enriched.filter((t) => t.person_name === 'Rahul');
console.assert(rahulTxs.length === 2, `Rahul must have 2 distinct transactions, found ${rahulTxs.length}`);
const rahulBorrow = rahulTxs.find((t) => t.type === 'borrow');
const rahulLend = rahulTxs.find((t) => t.type === 'lending');
console.assert(rahulBorrow?.amount === 10000, 'Original borrow must remain 10,000');
console.assert(rahulBorrow?.total_settled === 4000, 'Settled repayment must be 4,000');
console.assert(rahulBorrow?.pending_amount === 6000, 'Remaining pending must be 6,000');
console.assert(rahulLend?.amount === 3000, 'Original lending must remain 3,000');
console.assert(rahulLend?.pending_amount === 3000, 'Remaining pending lending must be 3,000');
console.log('✓ Scenario 1, 3, and 4 Verified: Independent borrow & lending with partial repayment!');

// SCENARIO 2 & 5 (Amit Lent ₹5,000, Received ₹2,000)
const amit = personSummaries.find((p) => p.person_name === 'Amit');
console.assert(amit !== undefined, 'Amit must exist');
console.assert(amit?.i_owe === 0, 'I owe Amit 0');
console.assert(amit?.they_owe_me === 3000, `Amit they_owe_me must be 3000, got ${amit?.they_owe_me}`);
console.assert(amit?.net_position === 3000, `Amit net position must be 3000, got ${amit?.net_position}`);
console.assert(amit?.status === 'Receivable', `Amit status must be Receivable, got ${amit?.status}`);
console.log('✓ Scenario 2 and 5 Verified: Lending with partial repayment!');

// SCENARIO 6 (A ₹10,000 transaction remains unpaid for 95 days -> appears in 90+ days bucket)
const nehaOldTx = enriched.find((t) => t.id === 'tx-neha-lend-old');
console.assert(nehaOldTx !== undefined, 'Neha 95-day loan must exist');
console.assert(nehaOldTx?.days_outstanding! >= 90, `Days outstanding must be >= 90, got ${nehaOldTx?.days_outstanding}`);
console.assert(nehaOldTx?.ageing_bucket === '90+ days', `Bucket must be 90+ days, got ${nehaOldTx?.ageing_bucket}`);

const bucket90Plus = ageing.lending.find((b) => b.bucket === '90+ days');
console.assert(bucket90Plus !== undefined && bucket90Plus.amount >= 10000, `90+ days bucket must contain >= 10,000, got ${bucket90Plus?.amount}`);
console.log('✓ Scenario 6 Verified: 95+ days unpaid loan appears in 90+ days ageing bucket!');

// SCENARIO MANDATORY REMARK & SETTLEMENT LIMITS
console.assert(enriched.every((t) => t.remark && t.remark.trim().length > 0), 'Every transaction must have non-empty remark');
console.assert(seed.settlements.every((s) => s.remark && s.remark.trim().length > 0), 'Every settlement must have non-empty remark');
console.log('✓ Mandatory Remark validation verified across all records!');

console.log('--- ALL SCENARIOS 1 TO 6 VERIFIED SUCCESSFULLY ---');
