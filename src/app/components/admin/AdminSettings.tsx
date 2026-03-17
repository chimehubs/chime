import { useState } from 'react';
import { motion } from 'motion/react';
import { Save, RotateCcw } from 'lucide-react';
import { Card } from '../ui/card';
import AdminLayout from './AdminLayout';

export default function AdminSettings() {
  const [formData, setFormData] = useState({
    platformName: 'Chima Finance',
    supportEmail: 'support@chimafinance.com',
    maxTransactionLimit: '50000',
    dailyWithdrawalLimit: '10000',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently under maintenance. Please check back soon.'
  });

  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 800));
    setStatusMsg('✓ General settings saved successfully!');
    setIsSaving(false);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleReset = () => {
    setFormData({
      platformName: 'Chima Finance',
      supportEmail: 'support@chimafinance.com',
      maxTransactionLimit: '50000',
      dailyWithdrawalLimit: '10000',
      maintenanceMode: false,
      maintenanceMessage: 'We are currently under maintenance. Please check back soon.'
    });
    setStatusMsg('Reset to default settings');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <AdminLayout title="Settings" subtitle="Manage general platform configuration">
      <div className="space-y-6">
        {/* Status Message */}
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-semibold"
          >
            {statusMsg}
          </motion.div>
        )}

        {/* General Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-8">General Settings</h2>

            <div className="space-y-6">
              {/* Platform Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">Platform Name</label>
                <p className="text-xs text-muted-foreground mb-2">The name of your banking platform</p>
                <input
                  type="text"
                  name="platformName"
                  title="Platform Name"
                  value={formData.platformName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 transition-ring"
                />
              </div>

              {/* Support Email */}
              <div>
                <label className="block text-sm font-semibold mb-2">Support Email Address</label>
                <p className="text-xs text-muted-foreground mb-2">Contact email for customer inquiries</p>
                <input
                  type="email"
                  name="supportEmail"
                  title="Support Email"
                  value={formData.supportEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 transition-ring"
                />
              </div>

              {/* Max Transaction Limit */}
              <div>
                <label className="block text-sm font-semibold mb-2">Maximum Transaction Limit</label>
                <p className="text-xs text-muted-foreground mb-2">Maximum amount per transaction in USD</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">$</span>
                  <input
                    type="number"
                    name="maxTransactionLimit"
                    title="Max Transaction Limit"
                    value={formData.maxTransactionLimit}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 transition-ring"
                  />
                </div>
              </div>

              {/* Daily Withdrawal Limit */}
              <div>
                <label className="block text-sm font-semibold mb-2">Daily Withdrawal Limit</label>
                <p className="text-xs text-muted-foreground mb-2">Maximum withdrawal per day in USD</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">$</span>
                  <input
                    type="number"
                    name="dailyWithdrawalLimit"
                    title="Daily Withdrawal Limit"
                    value={formData.dailyWithdrawalLimit}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 transition-ring"
                  />
                </div>
              </div>

              {/* Maintenance Mode */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Maintenance Mode</label>
                    <p className="text-xs text-muted-foreground">Enable maintenance mode to restrict user access</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      title="Enable Maintenance Mode"
                      checked={formData.maintenanceMode}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-border cursor-pointer"
                    />
                    <span className={`text-xs font-bold px-3 py-1 rounded ${
                      formData.maintenanceMode 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {formData.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Message */}
              {formData.maintenanceMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-semibold mb-2">Maintenance Message</label>
                  <p className="text-xs text-muted-foreground mb-2">Message shown to users when maintenance mode is active</p>
                  <textarea
                    name="maintenanceMessage"
                    title="Maintenance Message"
                    value={formData.maintenanceMessage}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 transition-ring"
                  />
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-border">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#00b388] text-white font-semibold rounded-lg hover:bg-[#009670] disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </motion.button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <h3 className="font-semibold text-blue-900 mb-2">Current Configuration</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><span className="font-medium">Platform:</span> {formData.platformName}</p>
              <p><span className="font-medium">Support:</span> {formData.supportEmail}</p>
              <p><span className="font-medium">Max Transaction:</span> ${Number(formData.maxTransactionLimit).toLocaleString()}</p>
              <p><span className="font-medium">Daily Limit:</span> ${Number(formData.dailyWithdrawalLimit).toLocaleString()}</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50">
            <h3 className="font-semibold text-amber-900 mb-2">ℹ️ Tips</h3>
            <ul className="space-y-2 text-sm text-amber-800 list-disc list-inside">
              <li>Set appropriate transaction limits for security</li>
              <li>Keep support email current for customer assistance</li>
              <li>Use maintenance mode during system updates</li>
              <li>All changes are saved immediately</li>
            </ul>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
