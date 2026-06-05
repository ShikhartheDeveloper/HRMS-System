import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface select-none">
      {/* Left Pane - Branding & Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-sidebar flex-col justify-between p-12 text-white relative">
        {/* Logo / Header */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center font-bold text-xs text-white">
            H
          </div>
          <span className="font-semibold text-lg tracking-wide">HRMS SaaS</span>
        </div>

        {/* Abstract SVG Graphic (Geometric shapes, Notion-like clean layout) */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-center">
          <svg
            className="w-full aspect-square text-primary/25"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft grid background */}
            <line x1="10" y1="50" x2="190" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="10" y1="150" x2="190" y2="150" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
            
            {/* Geometric Shapes representing team coordination */}
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="2" />
            <rect x="35" y="35" width="30" height="30" rx="6" fill="currentColor" fillOpacity="0.4" />
            <polygon points="165,35 180,65 150,65" fill="currentColor" fillOpacity="0.2" />
            <rect x="85" y="145" width="30" height="15" rx="4" fill="currentColor" fillOpacity="0.6" />
            
            {/* Connectivity lines */}
            <path d="M65,50 H100 V100" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M165,50 H100 V100" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M100,140 V100" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Your people. Simplified.</h2>
          <p className="text-sm text-sidebarText font-normal">
            Coordinating attendance, leave, workflows and org structures in one cohesive place.
          </p>
        </div>
      </div>

      {/* Right Pane - Content Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-sm space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
