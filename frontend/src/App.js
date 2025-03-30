import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Account Components
import AccountList from './components/accounts/AccountList';
import AccountDetail from './components/accounts/AccountDetail';
import AccountForm from './components/accounts/AccountForm';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
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
                  {/* Add more nav links here as we build more features */}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="py-10">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/accounts/new" element={<AccountForm />} />
              <Route path="/accounts/:id/edit" element={<AccountForm />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
            </Routes>
          </div>
        </main>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">Accounts</h2>
          <p className="text-gray-600 mb-4">Create and manage your financial accounts.</p>
          <Link to="/accounts" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            View Accounts
          </Link>
        </div>
        {/* Add more feature cards as we build them */}
      </div>
    </div>
  );
};

export default App;
