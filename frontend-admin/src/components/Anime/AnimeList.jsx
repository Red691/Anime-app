// src/components/Anime/AnimeList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { animeApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AnimeList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['anime', page, search, status],
    queryFn: () => animeApi.getAll({ page, limit: 20, search, status }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => animeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['anime']);
      toast.success('Anime deleted successfully');
    },
    onError: () => toast.error('Failed to delete anime'),
  });

  const anime = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Anime Management</h1>
        <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Add Anime
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-dark-800 p-4 rounded-xl border border-dark-600">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search anime..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-700 text-white pl-10 pr-4 py-2 rounded-lg border border-dark-600 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-dark-700 text-white px-4 py-2 rounded-lg border border-dark-600 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="airing">Airing</option>
            <option value="finished">Finished</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Anime</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Type</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Episodes</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Rating</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : anime.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No anime found
                  </td>
                </tr>
              ) : (
                anime.map((item) => (
                  <tr key={item._id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.coverImage} 
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <p className="text-white font-medium text-sm">{item.title}</p>
                          <p className="text-gray-500 text-xs">{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-dark-700 text-gray-300 text-xs rounded-full uppercase">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-white text-sm">
                      {item.episodesCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-white text-sm">{item.averageRating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-white transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-blue-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this anime?')) {
                              deleteMutation.mutate(item._id);
                            }
                          }}
                          className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-600">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white text-sm">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-2 hover:bg-dark-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    airing: 'bg-green-500/10 text-green-500',
    finished: 'bg-blue-500/10 text-blue-500',
    upcoming: 'bg-yellow-500/10 text-yellow-500',
    cancelled: 'bg-red-500/10 text-red-500',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-500/10 text-gray-500'}`}>
      {status}
    </span>
  );
}
