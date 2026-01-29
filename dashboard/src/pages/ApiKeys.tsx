import React, { useState, useEffect } from 'react';
import { ApiKey } from '../types';
import { apiKeyService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  PlusIcon, 
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

export const ApiKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const keysData = await apiKeyService.getApiKeys();
      setApiKeys(keysData);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newKey = await apiKeyService.createApiKey(newKeyName);
      setApiKeys([...apiKeys, newKey]);
      setIsCreateModalOpen(false);
      setNewKeyName('');
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      try {
        await apiKeyService.revokeApiKey(id);
        setApiKeys(apiKeys.map(key => 
          key.id === id ? { ...key, status: 'revoked' } : key
        ));
      } catch (error) {
        console.error('Failed to revoke API key:', error);
      }
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500">Manage API keys and client credentials</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            Showing {apiKeys.length} API keys
          </p>
          <Button variant="secondary" onClick={fetchData}>
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{key.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <code className="text-sm text-gray-500 font-mono">
                        {showKey[key.id] ? key.key : key.key.substring(0, 20) + '••••••••••••••••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey[key.id] ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
                      {key.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {key.status === 'active' && (
                      <Button variant="danger" size="sm" onClick={() => handleRevokeKey(key.id)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create API Key"
        size="lg"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <Input
            label="Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
            placeholder="e.g., Web Frontend, Mobile App"
          />
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800">Important</h4>
            <p className="text-sm text-blue-700 mt-1">
              Save this key securely. You won't be able to see it again after closing this dialog.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Key
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};