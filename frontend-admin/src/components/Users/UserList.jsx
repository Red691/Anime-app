// src/components/Users/UserList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, Ban, CheckCircle, XCircle } from 'lucide-react';
import { userApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function UserList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, role],
    queryFn: () => userApi.getAll({ page, limit: 50, search, role }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User updated successfully');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const users = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-dark-800 p-4 rounded-xl border border-dark-600">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-700 text-white pl-10 pr-4 py-2 rounded-lg border border-dark-600 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-dark-700 text-white px-4 py-2 rounded-lg border border-dark-600 focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Joined</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar || '/default-avatar.png'} 
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white font-medium text-sm">{user.displayName}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-2 py-1 text-xs rounded-full uppercase
                      ${user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 
                        user.role === 'moderator' ? 'bg-blue-500/10 text-blue-500' : 
                        'bg-gray-500/10 text-gray-500'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <span className="flex items-center gap-1 text-red-500 text-sm">
                        <Ban className="w-4 h-4" />
                        Banned
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newRole = user.role === 'user' ? 'moderator' : 'user';
                          updateMutation.mutate({ 
                            id: user._id, 
                            data: { role: newRole } 
                          });
                        }}
                        className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                        title="Toggle Role"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          updateMutation.mutate({ 
                            id: user._id, 
                            data: { isBanned: !user.isBanned } 
                          });
                        }}
                        className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${
                          user.isBanned ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'
                        }`}
                        title={user.isBanned ? 'Unban User' : 'Ban User'}
                      >
                        {user.isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
