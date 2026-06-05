import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import { GitFork, ChevronRight, User } from 'lucide-react';

const OrgChart = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrgData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/employees/org-chart');
        if (res.data.success) {
          setEmployees(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgData();
  }, []);

  // Build tree nodes recursive renderer
  const renderNode = (employee, allEmployees) => {
    // Direct reports for this employee
    const directReports = allEmployees.filter(
      (emp) => emp.managerId === employee._id || emp.managerId?._id === employee._id
    );

    return (
      <div key={employee._id} className="ml-8 space-y-4 relative border-l border-borderColor pl-6 pt-2">
        {/* Connection Node Circle */}
        <div className="absolute -left-1.5 top-5.5 h-3 w-3 rounded-full border border-primary bg-surface z-10"></div>

        {/* Card */}
        <div className="bg-surface p-4 rounded-card border border-borderColor shadow-custom max-w-xs hover:border-primary/40 transition-all flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-semibold text-textPrimary">
              {employee.firstName} {employee.lastName}
            </span>
            <span className="text-[11px] text-textSecondary">{employee.designation}</span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">{employee.department}</span>
          </div>
        </div>

        {/* Render direct reports recursively */}
        {directReports.length > 0 && (
          <div className="space-y-2">
            {directReports.map((report) => renderNode(report, allEmployees))}
          </div>
        )}
      </div>
    );
  };

  // Locate roots (employees who report to no manager or whose manager is missing from the list)
  const roots = employees.filter((emp) => {
    if (!emp.managerId) return true;
    // Check if their manager exists in the current list
    const managerExists = employees.some((m) => m._id === emp.managerId || m._id === emp.managerId?._id);
    return !managerExists;
  });

  return (
    <PageWrapper title="Organization Tree">
      <div className="space-y-6 text-left animate-fade-in">
        <div className="bg-surface p-4 rounded-card border border-borderColor shadow-custom flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-full text-primary">
            <GitFork className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-textPrimary">Hierarchical Reporting Structure</h3>
            <p className="text-xs text-textSecondary">
              Visualize reporting lines and division trees. Root managers are listed at the top level.
            </p>
          </div>
        </div>

        {/* Tree Container */}
        <div className="bg-surface p-8 rounded-card border border-borderColor shadow-custom overflow-x-auto min-h-[500px]">
          {loading ? (
            <div className="text-center py-20 text-textSecondary text-xs">
              Loading organization chart data...
            </div>
          ) : roots.length === 0 ? (
            <div className="text-center py-20 text-textSecondary text-xs">
              No employee relations mapped in directory.
            </div>
          ) : (
            <div className="space-y-6">
              {roots.map((root) => (
                <div key={root._id} className="space-y-2 border-l-0 ml-0 pl-0">
                  {/* Root card */}
                  <div className="bg-sidebar text-white p-4 rounded-card shadow-custom max-w-xs flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-white">
                      {root.firstName[0]}{root.lastName[0]}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[13px] font-semibold text-white">
                        {root.firstName} {root.lastName}
                      </span>
                      <span className="text-[11px] text-sidebarText">{root.designation}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{root.department}</span>
                    </div>
                  </div>

                  {/* Render kids of root */}
                  {employees
                    .filter((emp) => emp.managerId === root._id || emp.managerId?._id === root._id)
                    .map((child) => renderNode(child, employees))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrgChart;
