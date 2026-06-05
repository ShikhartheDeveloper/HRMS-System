import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import PageWrapper from '../../components/layout/PageWrapper';
import { Settings as SettingsIcon, Clock, Shield, CheckCircle, Building } from 'lucide-react';

const Settings = () => {
  const { user, tenant } = useAuthStore();
  const [gracePeriod, setGracePeriod] = useState(15);
  const [fullDayHours, setFullDayHours] = useState(8);
  const [halfDayThreshold, setHalfDayThreshold] = useState(4);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    // In a real app, this would POST to an API endpoint
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <PageWrapper title="Settings">
      <div className="space-y-8 text-left animate-fade-in max-w-3xl">
        {saved && (
          <div className="flex gap-2 p-3.5 rounded-button bg-success/10 border border-success/30 text-success text-xs font-semibold">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* Tenant Info Card */}
        <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-primary" />
            Organization Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-background p-3 rounded-button border border-borderColor">
              <span className="text-[10px] text-textSecondary font-semibold uppercase block">Tenant Name</span>
              <span className="font-bold text-textPrimary">{tenant?.name || 'Default Org'}</span>
            </div>
            <div className="bg-background p-3 rounded-button border border-borderColor">
              <span className="text-[10px] text-textSecondary font-semibold uppercase block">Subdomain</span>
              <span className="font-bold text-textPrimary">{tenant?.subdomain || 'default'}.hrms.local</span>
            </div>
          </div>
        </div>

        {/* Shift & Attendance Rules */}
        <form onSubmit={handleSave} className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-6">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-primary" />
            Shift & Attendance Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Grace Period (minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <p className="text-[10px] text-textSecondary">Minutes after shift start before marking as "Late".</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Full Day Hours</label>
              <input
                type="number"
                min="1"
                max="24"
                value={fullDayHours}
                onChange={(e) => setFullDayHours(parseInt(e.target.value) || 8)}
                className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <p className="text-[10px] text-textSecondary">Hours required for a full-day attendance mark.</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Half-Day Threshold (hours)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={halfDayThreshold}
                onChange={(e) => setHalfDayThreshold(parseInt(e.target.value) || 4)}
                className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <p className="text-[10px] text-textSecondary">Minimum hours to qualify as a half-day.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-borderColor flex justify-end">
            <button
              type="submit"
              className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer shadow-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>

        {/* Seeded Credentials Reference */}
        <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-primary" />
            Demo Credentials
          </h3>
          <p className="text-xs text-textSecondary">
            These seeded accounts are available on the default tenant (subdomain: <strong>default</strong>).
            All passwords are <code className="bg-background px-1.5 py-0.5 rounded text-primary font-mono text-[11px]">Password123</code>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Employee ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60 text-[12px]">
                <tr className="hover:bg-background/40">
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded-badge font-bold text-[11px]">HR_ADMIN</span></td>
                  <td className="px-4 py-2.5 font-medium text-textPrimary">admin@default.com</td>
                  <td className="px-4 py-2.5 text-textSecondary">EMP-2026-0001</td>
                </tr>
                <tr className="hover:bg-background/40">
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-warning/10 text-warning rounded-badge font-bold text-[11px]">MANAGER</span></td>
                  <td className="px-4 py-2.5 font-medium text-textPrimary">manager@default.com</td>
                  <td className="px-4 py-2.5 text-textSecondary">EMP-2026-0002</td>
                </tr>
                <tr className="hover:bg-background/40">
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-success/10 text-success rounded-badge font-bold text-[11px]">EMPLOYEE</span></td>
                  <td className="px-4 py-2.5 font-medium text-textPrimary">employee@default.com</td>
                  <td className="px-4 py-2.5 text-textSecondary">EMP-2026-0003</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Settings;
