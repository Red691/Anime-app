// src/components/Dashboard/DashboardStats.jsx
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Play, 
  Film, 
  Eye, 
  TrendingUp, 
  Activity,
  Clock
} from 'lucide-react';
import { userApi } from '../../services/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#f97316', '#ea580c', '#c2410c', '#9a3412'];

export default function DashboardStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await userApi.getStats();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const { overview, topAnime, serverHealth } = stats || {};

  const chartData = [
    { name: 'Mon', views: 4000, users: 2400 },
    { name: 'Tue', views: 3000, users: 1398 },
    { name: 'Wed', views: 2000, users: 9800 },
    { name: 'Thu', views: 2780, users: 3908 },
    { name: 'Fri', views: 1890, users: 4800 },
    { name: 'Sat', views: 2390, users: 3800 },
    { name: 'Sun', views: 3490, users: 4300 },
  ];

  const deviceData = [
    { name: 'Mobile', value: 65 },
    { name: 'Desktop', value: 25 },
    { name: 'TV', value: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={overview?.totalUsers?.toLocaleString() || '0'}
          change={`+${overview?.newUsersToday || 0} today`}
          icon={<Users className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Total Anime"
          value={overview?.totalAnime?.toLocaleString() || '0'}
          change={`${overview?.totalEpisodes || 0} episodes`}
          icon={<Film className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Total Views"
          value={overview?.totalViews?.toLocaleString() || '0'}
          change={`+${overview?.viewsToday || 0} today`}
          icon={<Eye className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Active Users"
          value={overview?.activeUsers?.toLocaleString() || '0'}
          change="Last 24h"
          icon={<Activity className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-dark-800 rounded-xl p-6 border border-dark-600">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              View Trends (7 Days)
            </h3>
            <select className="bg-dark-700 text-sm text-gray-300 rounded-lg px-3 py-1 border border-dark-600">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" stroke="#808080" />
              <YAxis stroke="#808080" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="views" 
                stroke="#f97316" 
                fillOpacity={1} 
                fill="url(#colorViews)" 
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="#ea580c" 
                fillOpacity={1} 
                fill="url(#colorUsers)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device Distribution */}
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-semibold text-white mb-6">Device Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {deviceData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Anime Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-500" />
            Top Performing Anime (This Month)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Rank</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Anime</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Views</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Avg. Completion</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {topAnime?.map((anime, index) => (
                <tr key={anime._id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                      ${index < 3 ? 'bg-primary-500/20 text-primary-500' : 'bg-dark-600 text-gray-400'}
                    `}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={anime.coverImage} 
                        alt={anime.title}
                        className="w-10 h-14 object-cover rounded-lg"
                      />
                      <div>
                        <p className="text-white font-medium text-sm">{anime.title}</p>
                        <p className="text-gray-500 text-xs">{anime.type?.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white text-sm">
                    {anime.totalViews?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${anime.avgCompletion}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{anime.avgCompletion}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Server Health */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${serverHealth?.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <h3 className="text-lg font-semibold text-white">Server Health</h3>
          </div>
          <span className="text-sm text-gray-400">
            <Clock className="w-4 h-4 inline mr-1" />
            Uptime: {Math.floor((serverHealth?.uptime || 0) / 3600)}h {Math.floor(((serverHealth?.uptime || 0) % 3600) / 60)}m
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Memory Usage</p>
            <p className="text-white font-mono mt-1">
              {Math.round((serverHealth?.memory?.heapUsed || 0) / 1024 / 1024)} MB
            </p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Last Check</p>
            <p className="text-white font-mono mt-1">
              {new Date(serverHealth?.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">API Version</p>
            <p className="text-white font-mono mt-1">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon, color }) {
  const colorClasses = {
    orange: 'bg-primary-500/10 text-primary-500',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-600 hover:border-primary-500/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
          {change}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-sm text-gray-400 mt-1">{title}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-dark-800 rounded-xl p-6 border border-dark-600 animate-pulse">
            <div className="h-12 w-12 bg-dark-600 rounded-lg" />
            <div className="mt-4 h-8 w-24 bg-dark-600 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
