import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Laptop, Clipboard, RefreshCw, UserPlus, Settings } from 'lucide-react';

const Assets = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('Laptop');
  const [cost, setCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [allocateEmp, setAllocateEmp] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const assetRes = await api.get('/premium/assets');
      if (assetRes.data.success) {
        setAssets(assetRes.data.data);
      }
      const empRes = await api.get('/employees');
      if (empRes.data.success) {
        setEmployees(empRes.data.data);
        if (empRes.data.data.length > 0) {
          setAllocateEmp(empRes.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/premium/assets', {
        name,
        serialNumber,
        category,
        cost: Number(cost),
        purchaseDate
      });
      if (res.data.success) {
        setShowAssetModal(false);
        setName('');
        setSerialNumber('');
        setCost('');
        setPurchaseDate('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/premium/assets/${selectedAsset._id}/allocate`, {
        employeeId: allocateEmp || null
      });
      if (res.data.success) {
        setShowAllocateModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAllocate = (asset) => {
    setSelectedAsset(asset);
    setShowAllocateModal(true);
  };

  return (
    <PageWrapper title="Asset Management">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Actions bar */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">IT & Physical Asset Registry</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Track hardware allocations, serial codes, maintenance schedules, and book value depreciation.</p>
          </div>
          {user.role === 'HR_ADMIN' && (
            <button
              onClick={() => setShowAssetModal(true)}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
            >
              <Laptop className="h-4 w-4" /> Add Asset Record
            </button>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-surface border border-borderColor rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-borderColor">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">Device Inventory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-background text-textSecondary border-b border-borderColor">
                <tr>
                  <th className="px-6 py-3 font-semibold">Asset Name</th>
                  <th className="px-6 py-3 font-semibold">Serial Number</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Purchase Value</th>
                  <th className="px-6 py-3 font-semibold">Assigned To</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-textSecondary font-medium">
                      No assets logged in the corporate inventory.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-background/50 transition-colors duration-150">
                      <td className="px-6 py-4 font-medium">{asset.name}</td>
                      <td className="px-6 py-4 font-mono">{asset.serialNumber}</td>
                      <td className="px-6 py-4">
                        <span className="bg-background border border-borderColor px-2 py-0.5 rounded text-[11px]">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">₹{asset.cost.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {asset.currentEmployeeId
                          ? `${asset.currentEmployeeId.firstName} ${asset.currentEmployeeId.lastName}`
                          : 'Available / Stock'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                          asset.status === 'Allocated'
                            ? 'bg-primary/10 text-primary'
                            : asset.status === 'Available'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role === 'HR_ADMIN' && (
                          <button
                            onClick={() => openAllocate(asset)}
                            className="text-primary hover:underline font-bold text-[12px] flex items-center gap-1 justify-end ml-auto"
                          >
                            <UserPlus className="h-4 w-4" /> Allocate
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

        {/* Add Asset Modal */}
        {showAssetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Log Asset Record</h3>
              <form onSubmit={handleCreateAsset} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Macbook Pro M3"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. C02X12345678"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="e.g. 120000"
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssetModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover"
                  >
                    Log Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Allocate Asset Modal */}
        {showAllocateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Allocate Asset</h3>
              <p className="text-[12px] text-textSecondary">Asset: <span className="font-semibold">{selectedAsset?.name} ({selectedAsset?.serialNumber})</span></p>
              <form onSubmit={handleAllocate} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Select Employee</label>
                  <select
                    value={allocateEmp}
                    onChange={(e) => setAllocateEmp(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  >
                    <option value="">-- Available in Stock / Return --</option>
                    {employees.map(e => (
                      <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-accent text-white rounded-button font-semibold hover:bg-accent-hover"
                  >
                    Update Allocation
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

export default Assets;
