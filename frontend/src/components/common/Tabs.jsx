import React from 'react';

const Tabs = ({ children, activeTab, setActiveTab }) => {
  const tabs = React.Children.toArray(children).filter(child => child.type?.displayName === 'Tab');

  return (
    <div>
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const { label, id } = tab.props;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-xs
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-3">
        {tabs.map((tab) => {
          const { id } = tab.props;
          if (activeTab === id) {
            // Render the content of the active tab
            return <div key={id}>{tab.props.children}</div>; 
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Tabs; 