# Design Decisions: Step 8 - Multi-Unit Support (aka "Multi-Currency")

This document summarizes the agreed-upon design for implementing Step 8 of the Household Finance App, focusing on supporting multiple units (like stocks, crypto, etc.) alongside standard currency (USD).

## Core Concepts

1.  **"Multi-Currency" = Multi-Unit:** The requirement is interpreted as supporting different units of measure within accounts (e.g., 'USD', 'stock:AAPL', 'crypto:BTC') rather than just traditional currency conversion.
2.  **KISS Principle:** Prioritize simplicity for the initial implementation (Step 8), deferring more complex accounting logic (like full cost-basis tracking) to later steps.
3.  **Iterative Approach:** Build the foundation now, and enhance with more automation later.

## Backend Changes

1.  **`Account` Schema:**
    *   Add a `unit` field: `{ type: String, required: true, default: 'USD' }`.
2.  **`Transaction.isBalanced` Virtual Property:**
    *   If all entries in a transaction share the *same* `unit`: Balanced if `sum(debits) == sum(credits)` for that unit (within tolerance).
    *   If entries have *different* `units`: Considered **implicitly balanced** by definition (representing an exchange).
3.  **New `AssetPrice` Model:**
    *   Purpose: Store historical asset prices **for reporting purposes only** (e.g., asset valuation over time). **Not used** for transaction balancing logic in Step 8.
    *   Fields: baseCurrency, targetCurrency, rate, date
    *   Implement basic CRUD API endpoints (`/api/asset-prices`).
4.  **Cost Basis:**
    *   **No backend tracking** of cost basis or sold status for individual asset lots in Step 8.
    *   Users are **manually responsible** for adding separate entries within transactions to account for capital gains or losses when selling non-USD assets.

## Frontend Changes

1.  **Account UI:**
    *   Add `unit` field (text input, default 'USD') to Account create/edit forms.
    *   Display the `unit` alongside balances in lists and details.
2.  **Transaction Modal Enhancements (for Selling Non-USD Assets):**
    *   When an entry is added that *reduces* a non-USD asset (e.g., `-5 stock:AAPL`), display an informational table (`CostBasisLotsTable`) below it.
    *   `CostBasisLotsTable`:
        *   Queries and displays previous *purchase* entries for that specific asset in that account (Date, Qty, calculated Cost/Unit).
        *   **Read-only data.**
        *   Each row has a **"Select Lot" button**.
    *   **"Select Lot" Button Actions:**
        *   **1. Populate Memo:** Appends basis details (e.g., `Basis: 10 @ $100 from 2023-01-01`) to the memo of the main asset sale entry.
        *   **2. Optional Calculation Helper:** Shows temporary inputs ("Sale Price/share") and a button ("Calculate & Add Gain/Loss Entry"). If used, calculates the gain/loss based on the selected lot's basis and the entered sale price, then adds the corresponding gain/loss entry to the transaction, populating its memo.
3.  **Other UI Helpers:**
    *   Suggest `Income:Capital Gains` / `Expenses:Capital Losses` accounts when adding entries after an asset sale entry.
    *   Use memo field placeholders as reminders for gain/loss entries.

## Rationale for Compromise

This approach provides the core multi-unit functionality and significantly aids the user in manually handling asset sales (via the informational table and optional calculation helper) without requiring complex backend changes for full cost-basis tracking at this stage. It prioritizes reducing manual calculation errors while adhering to the iterative development plan. 