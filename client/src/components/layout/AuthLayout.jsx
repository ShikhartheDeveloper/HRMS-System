import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background select-none">
      {/* Left Pane - Branding & Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#090D1F] via-[#0D1530] to-[#1E1B4B] flex-col justify-between p-12 text-white relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-accent/10 rounded-full blur-[100px] animate-pulse-slow translate-x-1/2 translate-y-1/2 pointer-events-none" />
        
        {/* Subtle Pattern Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Logo / Header */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-extrabold text-base text-white shadow-lg shadow-primary/25">
            H
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">HRMS Elite</span>
        </div>

        {/* Abstract Dynamic SVG Graphic */}
        <div className="relative z-10 w-full max-w-[280px] mx-auto flex items-center justify-center animate-float">
          <svg
            className="w-full aspect-square text-white"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Connection links */}
            <path d="M40 70 L100 40 L160 70 L160 130 L100 160 L40 130 Z" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <path d="M40 70 L100 100 L160 70" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <path d="M100 40 L100 100 L100 160" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <path d="M40 130 L100 100 L160 130" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

            {/* Glowing lines */}
            <path d="M40 70 L100 100 L100 160" stroke="url(#line-grad-1)" strokeWidth="2.5" strokeLinecap="round" className="opacity-80" />
            <path d="M160 70 L100 100 L160 130" stroke="url(#line-grad-2)" strokeWidth="2.5" strokeLinecap="round" className="opacity-80" />

            {/* Central Node */}
            <circle cx="100" cy="100" r="16" fill="url(#central-grad)" className="filter drop-shadow-[0_0_12px_rgba(79,70,229,0.5)]" />
            <circle cx="100" cy="100" r="7" fill="#FFFFFF" />

            {/* Outer Nodes */}
            <circle cx="100" cy="40" r="10" fill="url(#accent-grad)" className="filter drop-shadow-[0_0_8px_rgba(13,148,136,0.4)]" />
            <circle cx="40" cy="70" r="8" fill="#090D1F" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="160" cy="70" r="8" fill="#090D1F" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="40" cy="130" r="8" fill="#090D1F" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="160" cy="130" r="8" fill="#090D1F" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="100" cy="160" r="10" fill="url(#primary-grad)" className="filter drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]" />

            {/* Micro details / data packets */}
            <circle cx="70" cy="85" r="3" fill="#0D9488" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="130" cy="115" r="3" fill="#4F46E5" className="animate-ping" style={{ animationDuration: '4s' }} />

            <defs>
              <linearGradient id="central-grad" x1="100" y1="84" x2="100" y2="116" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4F46E5" />
                <stop offset="1" stopColor="#0D9488" />
              </linearGradient>
              <linearGradient id="primary-grad" x1="100" y1="150" x2="100" y2="170" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4F46E5" />
                <stop offset="1" stopColor="#4338CA" />
              </linearGradient>
              <linearGradient id="accent-grad" x1="100" y1="30" x2="100" y2="50" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0D9488" />
                <stop offset="1" stopColor="#0F766E" />
              </linearGradient>
              <linearGradient id="line-grad-1" x1="40" y1="70" x2="100" y2="160" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4F46E5" stopOpacity="0.8" />
                <stop offset="1" stopColor="#0D9488" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="line-grad-2" x1="160" y1="70" x2="160" y2="130" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0D9488" stopOpacity="0.8" />
                <stop offset="1" stopColor="#4F46E5" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Tagline */}
        <div className="space-y-3 relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Your People. Simplified.
          </h2>
          <p className="text-sm text-sidebarText leading-relaxed">
            Coordinating attendance, leave, workflows and org structures in one cohesive, intelligence-driven place.
          </p>
        </div>
      </div>

      {/* Right Pane - Content Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md p-8 md:p-10 bg-white rounded-card shadow-card border border-borderColor/40 space-y-6 transition-all duration-300 hover:shadow-glow hover:border-primary/20 animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
