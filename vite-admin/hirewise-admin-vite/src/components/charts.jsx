'use client';

import { useEffect, useState } from 'react';
import { User, Building, Briefcase } from 'lucide-react';
import { API_BASE } from '../lib/config';
import { toArrayPayload } from '../lib/normalize';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

const GENDER_COLORS = {
  Male: '#42A5F5',
  Female: '#F06292',
  Other: '#FFCA28'
};

const DEPARTMENT_COLORS = [
  '#4db6ac', '#7986cb', '#9575cd', '#64b5f6', 
  '#4dd0e1', '#81c784', '#ffb74d', '#ba68c8',
  '#e57373', '#4facfe'
];

const EXPERIENCE_BUCKETS = [
  'Fresher',
  '1 month–2 years',
  '2–5 years',
  '5–10 years',
  '10+ years'
];

const parseExperienceToMonths = (expValue) => {
  if (expValue === null || expValue === undefined) return null;
  const expText = String(expValue).trim();
  if (!expText) return null;

  const lower = expText.toLowerCase();
  if (lower.includes('fresher')) return 0;

  const yearsMatch = lower.match(/(\d+(?:\.\d+)?)\s*(years?|yrs?)/);
  const monthsMatch = lower.match(/(\d+(?:\.\d+)?)\s*(months?|mos?)/);

  let months = 0;
  if (yearsMatch) months += Math.round(Number(yearsMatch[1]) * 12);
  if (monthsMatch) months += Math.round(Number(monthsMatch[1]));

  if (months > 0) return months;
  if (yearsMatch || monthsMatch) return 0;

  // Fallback: plain numeric values (common in some legacy rows)
  const numeric = Number(expText);
  if (Number.isFinite(numeric)) {
    // Treat <= 30 as years, otherwise months.
    return numeric <= 30 ? Math.round(numeric * 12) : Math.round(numeric);
  }

  return null;
};

const categorizeExperience = (expText) => {
  const months = parseExperienceToMonths(expText);
  if (months === null) return null;
  if (months === 0) return 'Fresher';
  if (months <= 24) return '1 month–2 years';
  if (months <= 60) return '2–5 years';
  if (months <= 120) return '5–10 years';
  return '10+ years';
};

// Helper function to capitalize first letter of department names
const capitalizeDepartmentName = (name) => {
  if (!name) return 'Unknown';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export default function AnalyticsDashboard({ selectedView = 'teaching' }) {
  const [genderData, setGenderData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 Fetching chart data from BACKEND');

        // Use backend API instead of direct Supabase
        const response = await fetch(`${API_BASE}/api/applications/stats/charts`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const payload = await response.json();
        const rows = toArrayPayload(payload);
        console.log('📊 Got', rows.length, 'rows from backend');

        // Filter by teaching/non-teaching in JavaScript
        const isTeaching = (pos) => {
          if (!pos) return false;
          const lower = pos.toLowerCase();
          return lower.includes('professor') || lower === 'teaching';
        };

        const filtered = rows.filter(row => 
          selectedView === 'teaching' ? isTeaching(row.position) : !isTeaching(row.position)
        );

        // Experience aggregation
        const expRaw = filtered.map(r => ({ years_of_experience: r.years_of_experience }));
        if (expRaw.length > 0) {
          const experienceCounts = EXPERIENCE_BUCKETS.reduce((acc, bucket) => {
            acc[bucket] = 0;
            return acc;
          }, {});
          expRaw.forEach(({ years_of_experience }) => {
            const range = categorizeExperience(years_of_experience);
            if (!range) return;
            experienceCounts[range]++;
          });
          const totalKnown = Object.values(experienceCounts).reduce((sum, count) => sum + count, 0);
          if (totalKnown === 0) {
            setExperienceData([]);
          } else {
            setExperienceData(
              Object.entries(experienceCounts).map(([range, count]) => ({
                range,
                count,
                percentage: Math.round((count / totalKnown) * 100)
              }))
            );
          }
        } else {
          setExperienceData([]);
        }

        // Gender aggregation
        const genderCounts = filtered.reduce((acc, r) => {
          const g = (r.gender || 'Other').trim() || 'Other';
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {});
        setGenderData(
          Object.entries(genderCounts).map(([g, count]) => ({
            name: g,
            value: count,
            color: GENDER_COLORS[g] || '#9E9E9E'
          }))
        );

        // Department aggregation
        const deptCounts = filtered.reduce((acc, r) => {
          const d = (r.department || 'Unknown').trim() || 'Unknown';
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {});
        setDepartmentData(
          Object.entries(deptCounts).map(([d, count], index) => ({
            name: capitalizeDepartmentName(d),
            applications: count,
            color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]
          }))
        );
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to dummy experience data if there's an error
        setExperienceData([
          { range: 'Fresher', count: 8, percentage: 8 },
          { range: '1 month–2 years', count: 25, percentage: 25 },
          { range: '2–5 years', count: 33, percentage: 33 },
          { range: '5–10 years', count: 22, percentage: 22 },
          { range: '10+ years', count: 12, percentage: 12 }
        ]);
        setGenderData([]);
        setDepartmentData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedView]); // Re-fetch when selectedView changes

  const totalGenderCount = genderData.reduce((sum, item) => sum + (item.value || 0), 0);
  const orderedGenderData = [...genderData].sort((a, b) => {
    const order = { Male: 0, Female: 1, Other: 2 };
    const aRank = order[a.name] ?? 99;
    const bRank = order[b.name] ?? 99;
    return aRank - bRank;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 px-6 pb-4">
      {/* Gender Semi-Circle Chart (30%) */}
      <div className="w-full lg:w-[30%] bg-white rounded-lg shadow-sm p-4 border border-gray-200 border-opacity-60">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Gender Distribution
        </h2>
        <div className="h-64 flex flex-col">
          {genderData.length > 0 ? (
            <>
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                    <Pie
                      data={orderedGenderData}
                      cx="50%"
                      cy="90%"
                      labelLine={false}
                      label={false}
                      outerRadius={120}
                      innerRadius={62}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1000}
                      startAngle={180}
                      endAngle={0}
                    >
                      {orderedGenderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} applicants`, '']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        padding: '8px 12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {orderedGenderData.map((entry) => {
                  const percentage = totalGenderCount > 0 ? Math.round((entry.value / totalGenderCount) * 100) : 0;
                  return (
                    <div
                      key={`gender-legend-${entry.name}`}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                      <span className="text-gray-500">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No gender data available.</p>
          )}
        </div>
      </div>
{/* Experience Visuals (30%) */}
<div className="w-full lg:w-[30%] bg-white rounded-lg shadow-sm p-4 border border-gray-200 border-opacity-60">
  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
    <Briefcase className="h-5 w-5 mr-2" />
    Experience Distribution
  </h2>
  <div className="space-y-3 font-mono text-sm text-gray-800">
    {experienceData.length > 0 ? (
      experienceData.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between">
            <span>{item.range}</span>
            <span className="text-blue-600">{item.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${item.percentage}%` }}
            ></div>
          </div>
        </div>
      ))
    ) : (
      <p className="text-sm text-gray-500">No experience data available.</p>
    )}
  </div>
</div>

      {/* Department Bar Chart (40%) */}
      <div className="w-full lg:w-[40%] bg-white rounded-lg shadow-sm p-2 border border-gray-200 border-opacity-60 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Applications by Department
        </h2>
        <div className="flex-1 min-h-[192px] flex items-end">
          {departmentData.length > 0 ? (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={departmentData}
                  margin={{ top: 15, right: 5, left: 0, bottom: 0 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '8px 12px'
                    }}
                    formatter={(value) => [`${value} applications`, '']}
                    labelFormatter={(label) => `Department: ${label}`}
                  />
                  <Bar 
                    dataKey="applications" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No department data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
