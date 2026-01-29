import React, { useState, useEffect } from 'react';
import { Permission } from '../types';
import { useData } from '../contexts/DataContext';
import { permissionService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const Permissions: React.FC = () => {
  const { permissions, loading, refreshPermissions } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    resource: '',
    action: 'read' as 'read' | 'write' | 'update' | 'delete' | 'manage',
    description: '',
    tags: '',
  });

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPermission = await permissionService.createPermission({
        name: formData.name,
        resource: formData.resource,
        action: formData.action,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()),
      });
      refreshPermissions();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      resource: '',
      action: 'read',
      description: '',
      tags: '',
    });
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'read': return 'info';
      case 'write': return 'success';
      case 'update': return 'warning';
      case 'delete': return 'danger';
      case 'manage': return 'secondary';
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
          <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage fine-grained permissions</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Permission
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
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-2 sm:mt-0 sm:ml-3">
            <Button variant="secondary" onClick={refreshPermissions}>
              <ArrowPathIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {permission.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permission.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getActionBadgeVariant(permission.action)}>
                      {permission.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {permission.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {permission.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Permission Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Permission"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Permission Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            label="Resource"
            value={formData.resource}
            onChange={(e) => setFormData({...formData, resource: e.target.value})}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={formData.action}
              onChange={(e) => setFormData({...formData, action: e.target.value as any})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="manage">Manage</option>
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
          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            placeholder="user,admin,read"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Permission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
