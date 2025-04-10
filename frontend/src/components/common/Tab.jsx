import React from 'react';

// This component doesn't render anything itself.
// It's used by Tabs to get the label, id, and children content.
const Tab = ({ children }) => {
  return <>{children}</>;
};

// Set displayName for type checking in Tabs component
Tab.displayName = 'Tab'; 

export default Tab; 