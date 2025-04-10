import React from 'react';

/**
 * A reusable component to provide a consistent frame and title 
 * for content within tabs.
 */
const TabContentFrame = ({ title, children }) => {
  return (
    // Outer container with border and shadow, similar to ManualEntrySearch
    <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
      {/* Optional Title Bar */}
      {title && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        </div>
      )}
      {/* Content Area */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default TabContentFrame; 