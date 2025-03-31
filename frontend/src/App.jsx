import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Account Components
import AccountList from './components/accounts/AccountList';
import AccountDetail from './components/accounts/AccountDetail';

// Transaction Components
import TransactionList from './components/transactions/TransactionList';
import TransactionDetail from './components/transactions/TransactionDetail';

// Report Components
import ReportDashboard from './components/reports/ReportDashboard';

// Rule Components
import RuleList from './components/rules/RuleList';
import RuleTest from './components/rules/RuleTest';

// Wrapper component to apply container styles
const MainContent = ({ children }) => {
  return (
    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
      {children}
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-blue-600">
                    Household Finance
                  </Link>
                </div>
                <div className="ml-6 flex space-x-8">
                  <Link to="/accounts" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Accounts
                  </Link>
                  <Link to="/transactions" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Transactions
                  </Link>
                  <Link to="/reports" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Reports
                  </Link>
                  <Link to="/rules" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Rules
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="py-6 flex-grow">
          <MainContent>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/transactions" element={<TransactionList />} />
              <Route path="/transactions/:id" element={<TransactionDetail />} />
              <Route path="/reports" element={<ReportDashboard />} />
              <Route path="/rules" element={<RuleList />} />
              <Route path="/rules/test/:id" element={<RuleTest />} />
            </Routes>
          </MainContent>
        </main>
        
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

// Simple home page component
const Home = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Household Finance</h1>
      <p className="text-gray-600 mb-6">
        Manage your personal finances with ease. Track accounts, transactions, and generate reports.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">Accounts</h2>
          <p className="text-gray-600 mb-4">Create and manage your financial accounts.</p>
          <Link to="/accounts" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            View Accounts
          </Link>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">Transactions</h2>
          <p className="text-gray-600 mb-4">Record and track financial transactions.</p>
          <Link to="/transactions" className="inline-block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">
            View Transactions
          </Link>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <h2 className="text-lg font-semibold text-green-800 mb-3">Reports</h2>
          <p className="text-gray-600 mb-4">Generate financial reports and summaries.</p>
          <Link to="/reports" className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
            View Reports
          </Link>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
          <h2 className="text-lg font-semibold text-purple-800 mb-3">Rules</h2>
          <p className="text-gray-600 mb-4">Create rules to automate transaction balancing.</p>
          <Link to="/rules" className="inline-block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition">
            View Rules
          </Link>
        </div>
      </div>
    </div>
  );
};

export default App;
