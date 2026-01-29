import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

export const Settings: React.FC = () => {
  const [formData, setFormData] = useState({
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    sessionTimeout: 24,
    enableMfa: false,
    allowedIps: '',
    environment: 'production',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real app, this would call an API
      console.log('Settings updated:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure system security and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Security Settings */}
        <Card title="Security Settings">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Minimum Password Length"
                type="number"
                min="6"
                max="128"
                value={formData.passwordMinLength}
                onChange={(e) => setFormData({...formData, passwordMinLength: parseInt(e.target.value)})}
              />
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="requireNumbers"
                  checked={formData.passwordRequireNumbers}
                  onChange={(e) => setFormData({...formData, passwordRequireNumbers: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="requireNumbers" className="ml-2 block text-sm text-gray-900">
                  Require Numbers
                </label>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="requireSpecial"
                  checked={formData.passwordRequireSpecial}
                  onChange={(e) => setFormData({...formData, passwordRequireSpecial: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="requireSpecial" className="ml-2 block text-sm text-gray-900">
                  Require Special Characters
                </label>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableMfa"
                checked={formData.enableMfa}
                onChange={(e) => setFormData({...formData, enableMfa: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="enableMfa" className="ml-2 block text-sm text-gray-900">
                Enable Multi-Factor Authentication (MFA)
              </label>
            </div>
          </div>
        </Card>

        {/* Session Settings */}
        <Card title="Session Management">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Session Timeout (hours)"
              type="number"
              min="1"
              max="168"
              value={formData.sessionTimeout}
              onChange={(e) => setFormData({...formData, sessionTimeout: parseInt(e.target.value)})}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({...formData, environment: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Network Security */}
        <Card title="Network Security">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed IP Addresses (comma-separated)
            </label>
            <textarea
              value={formData.allowedIps}
              onChange={(e) => setFormData({...formData, allowedIps: e.target.value})}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="192.168.1.0/24, 10.0.0.0/8"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to allow all IPs. Use CIDR notation for ranges.
            </p>
          </div>
        </Card>

        {/* System Information */}
        <Card title="System Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">RBAC Engine</p>
                <p className="text-sm text-gray-500">v2.1.0</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <ClockIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Uptime</p>
                <p className="text-sm text-gray-500">99.98%</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <GlobeAltIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Region</p>
                <p className="text-sm text-gray-500">us-east-1</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" type="submit">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};