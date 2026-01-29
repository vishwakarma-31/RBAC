import React, { useState } from 'react';
import { Policy } from '../types';
import { useData } from '../contexts/DataContext';
import { policyService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export const Policies: React.FC = () => {
  const { policies, loading, refreshPolicies } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'rbac' as 'rbac' | 'abac' | 'hybrid',
    content: '{}',
  });

  const filteredPolicies = policies.filter(policy =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPolicy = await policyService.createPolicy({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        version: '1.0.0',
        content: JSON.parse(formData.content),
        enabled: true,
      });
      refreshPolicies();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await policyService.deletePolicy(id);
        refreshPolicies();
      } catch (error) {
        console.error('Failed to delete policy:', error);
      }
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const updatedPolicy = await policyService.updatePolicy(id, { enabled: !enabled });
      refreshPolicies();
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const openViewModal = (policy: Policy) => {
    setViewingPolicy(policy);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'rbac',
      content: '{}',
    });
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'rbac': return 'info';
      case 'abac': return 'success';
      case 'hybrid': return 'warning';
      default: return 'secondary';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="mt-1 text-sm text-gray-500">Manage authorization policies</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Policy
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-2 sm:mt-0 sm:ml-3">
            <Button variant="secondary" onClick={refreshPolicies}>
              <ArrowPathIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPolicies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getTypeBadgeVariant(policy.type)}>{policy.type.toUpperCase()}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.version}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {policy.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant={policy.enabled ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => toggleEnabled(policy.id, policy.enabled)}
                    >
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => openViewModal(policy)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(policy.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Policy Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Policy"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="rbac">RBAC</option>
              <option value="abac">ABAC</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Content (JSON)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={6}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm font-mono text-sm"
              placeholder='{"rules": [{"role": "admin", "resource": "users", "action": "read"}]}'
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Policy
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Policy Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`View Policy: ${viewingPolicy?.name}`}
        size="xl"
      >
        {viewingPolicy && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Type</h3>
              <p className="text-sm text-gray-500">{viewingPolicy.type.toUpperCase()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Version</h3>
              <p className="text-sm text-gray-500">{viewingPolicy.version}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Description</h3>
              <p className="text-sm text-gray-500">{viewingPolicy.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Content</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                {JSON.stringify(viewingPolicy.content, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
