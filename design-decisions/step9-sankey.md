# Design Decisions: Step 9 - Basic Sankey Diagram

**Goal:** Implement a basic Sankey diagram visualization showing cash flow between accounts over a selected period (defaulting to the last 90 days), with visual distinctions for non-USD units.

## Phase 1: Backend API Development (`/api/reports/sankey`)

1.  **Explore Existing Code:**
    *   Examine files within `backend/src/controllers/reportController` (`cashflowReports.js`, `balanceReports.js`, etc.) and related services (e.g., `ReportingService` if it exists) to understand current patterns for fetching transactions, accessing account details, data aggregation, and response formatting.
    *   Identify reusable functions to minimize redundancy.

2.  **API Endpoint & Controller:**
    *   Create `backend/src/controllers/reportController/sankeyReport.js`.
    *   Define a `GET /api/reports/sankey` route handler accepting optional `startDate` and `endDate` query parameters (default: last 90 days).
    *   Update `backend/src/controllers/reportController/index.js` to register the new route.

3.  **Service Logic (in existing `ReportingService` or new `SankeyService`):**
    *   Implement `generateSankeyData(startDate, endDate)`.
    *   **Fetch Data:** Retrieve transactions within the date range, including entry lines and account details (ID, name, type, unit).
    *   **Node Generation:** Create unique node objects: `{ id: string, name: string, type: string, unit: string }`.
    *   **Link Generation:** Process transactions into flows, creating initial link objects: `{ source: string, target: string, value: number, unit: string, transactionIds: string[] }`. Aggregate these links by `source`, `target`, and `unit`, summing `value` and collecting `transactionIds`.
    *   **Node Flow Calculation:** Calculate `totalFlow` for each node (sum of incoming + outgoing link values) and add it to the node object.
    *   Return `{ nodes, links }`.

4.  **Controller Implementation (`sankeyReport.js`):**
    *   Parse/validate `startDate` and `endDate`.
    *   Call `generateSankeyData`.
    *   Send the `{ nodes, links }` data as JSON response.

## Phase 2: Frontend Implementation

1.  **Explore Existing Code:**
    *   Review `frontend/src/components/reports` (e.g., `ReportDashboard.jsx`, `DateRangePicker.jsx`) and API services (`frontend/src/services/api`) to understand component structure, state management, API call patterns, and date handling.

2.  **API Service:**
    *   Add `fetchSankeyData(startDate, endDate)` to the frontend API service layer to call `GET /api/reports/sankey`.

3.  **Main Report Component:**
    *   Create `frontend/src/components/reports/SankeyDiagramReport.jsx`.
    *   Include `DateRangePicker`.
    *   Manage state for dates, fetched data (`nodes`, `links`), loading, errors.
    *   Use `useEffect` to fetch data on date changes.
    *   Pass `sankeyData` to the visualization component.

4.  **Sankey Visualization Component:**
    *   Create `frontend/src/components/charts/SankeyDiagram.jsx`.
    *   Accept `nodes` and `links` as props.
    *   **Dependencies:** Ensure `d3` and `d3-sankey` are project dependencies.
    *   **Rendering Logic (D3.js):**
        *   Use `d3.sankey()` layout generator.
        *   Render SVG with `<rect>` for nodes and `<path>` for links.
        *   **Layout:** Configure layout. Attempt to enforce Income (left) / Expense (right) alignment with aligned starting heights.
        *   **Node Height:** Based on `node.totalFlow`.
        *   **Color Schema:** Use distinct colors for node types (Income, Expense, Asset, Liability, Equity). Color links based on source node type.
        *   **Non-USD Units:** Apply a distinct visual style (e.g., dashed stroke, label) to non-default unit nodes/links.
        *   **Interactivity:** Add tooltips on hover for nodes and links displaying relevant details.

5.  **Integration:**
    *   Add `SankeyDiagramReport` to the application's reporting section/dashboard.

## Phase 3: Testing

1.  **Backend:** Unit/integration tests for service logic and API endpoint.
2.  **Frontend:** Component tests for Sankey components. E2E tests for functionality.
3.  **Manual:** Verify visual accuracy, data correctness, interactivity, and non-USD handling against sample data. 