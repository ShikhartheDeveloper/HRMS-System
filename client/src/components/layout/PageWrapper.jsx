import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PageWrapper = ({ children, title }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar header */}
        <Topbar title={title} />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;
