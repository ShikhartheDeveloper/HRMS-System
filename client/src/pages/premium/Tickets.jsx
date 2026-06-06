import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { MessageSquare, Plus, HelpCircle, CheckSquare, Clock } from 'lucide-react';

const Tickets = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HR');
  const [priority, setPriority] = useState('Medium');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/premium/tickets');
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/premium/tickets', {
        title,
        description,
        category,
        priority
      });
      if (res.data.success) {
        setShowTicketModal(false);
        setTitle('');
        setDescription('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id) => {
    const notes = prompt('Resolution notes:');
    if (notes === null) return;
    try {
      const res = await api.put(`/premium/tickets/${id}/resolve`, {
        resolutionNotes: notes
      });
      if (res.data.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageWrapper title="Helpdesk & HR Tickets">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Actions bar */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Helpdesk Console</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Raise queries to IT, HR, Admin or Finance teams and track SLA responses.</p>
          </div>
          <button
            onClick={() => setShowTicketModal(true)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
          >
            <Plus className="h-4 w-4" /> Raise Support Ticket
          </button>
        </div>

        {/* Tickets log */}
        <div className="bg-surface border border-borderColor rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-borderColor">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">All Support Queries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-background text-textSecondary border-b border-borderColor">
                <tr>
                  <th className="px-6 py-3 font-semibold">Creator</th>
                  <th className="px-6 py-3 font-semibold">Subject</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Priority</th>
                  <th className="px-6 py-3 font-semibold">SLA Due Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-textSecondary font-medium">
                      No tickets submitted.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t._id} className="hover:bg-background/50 transition-colors duration-150">
                      <td className="px-6 py-4 font-medium">
                        {t.employeeId ? `${t.employeeId.firstName} ${t.employeeId.lastName}` : 'Me'}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-textPrimary">{t.title}</p>
                          <p className="text-[11px] text-textSecondary line-clamp-1">{t.description}</p>
                          {t.resolutionNotes && (
                            <p className="text-[10px] text-success font-medium italic mt-1">Resolution: "{t.resolutionNotes}"</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-background border border-borderColor px-2 py-0.5 rounded text-[11px] font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-primary">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                          t.priority === 'Urgent' || t.priority === 'High'
                            ? 'bg-danger/10 text-danger'
                            : t.priority === 'Medium'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-textSecondary/10 text-textSecondary'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-textSecondary font-mono flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {t.slaDueDate ? new Date(t.slaDueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                          t.status === 'Resolved' || t.status === 'Closed'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.status !== 'Resolved' && (user.role === 'HR_ADMIN' || user.role === 'MANAGER') && (
                          <button
                            onClick={() => handleResolve(t._id)}
                            className="text-success hover:underline font-semibold"
                          >
                            Resolve Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Raise Ticket Modal */}
        {showTicketModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Raise Support Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Subject Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Printer is offline on 3rd floor"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Issue Description</label>
                  <textarea
                    rows="3"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide detailed description of the issues..."
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Helpdesk Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="IT">IT Support</option>
                      <option value="HR">HR Query</option>
                      <option value="Admin">Admin Facilities</option>
                      <option value="Finance">Finance / Reimbursement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover"
                  >
                    Submit Query
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Tickets;
