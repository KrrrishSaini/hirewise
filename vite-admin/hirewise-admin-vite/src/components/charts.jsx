'use client';

import { useEffect, useState } from 'react';
import { User, Building, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend
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

// Updated helper function to parse text experience values
const categorizeExperience = (expText) => {
  if (!expText) return "Unknown";
  
  // Extract years number from text (handles "4 years 6 months", "2 years", etc.)
  const yearsMatch = expText.match(/(\d+)\s*years?/i);
  if (!yearsMatch) return "Unknown";
  
  const years = parseInt(yearsMatch[1], 10);
  
  if (years <= 2) return "0–2 Years";
  if (years <= 5) return "2–5 Years";
  if (years <= 10) return "5–10 Years";
  return "10+ Years";
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

        // Single query to get rows used by all charts, filtered by position type
        let query = supabase
          .from('faculty_applications')
          .select('gender, department, years_of_experience, position');
        
        // Filter based on selectedView (teaching vs non-teaching)
        if (selectedView === 'teaching') {
          // Teaching positions
          query = query.or('position.ilike.%professor%,position.eq.teaching');
        } else {
          // Non-teaching positions
          query = query.not('position', 'ilike', '%professor%').neq('position', 'teaching');
        }
        
        const { data: rows, error: rowsErr } = await query;
        if (rowsErr) throw rowsErr;

        // Experience aggregation
        const expRaw = rows?.map(r => ({ years_of_experience: r.years_of_experience })) || [];
        if (expRaw.length > 0) {
          const experienceCounts = {
            '0–2 Years': 0,
            '2–5 Years': 0,
            '5–10 Years': 0,
            '10+ Years': 0,
            'Unknown': 0
          };
          expRaw.forEach(({ years_of_experience }) => {
            const range = categorizeExperience(years_of_experience);
            experienceCounts[range]++;
          });
          if (experienceCounts['Unknown'] === 0) delete experienceCounts['Unknown'];
          const total = expRaw.length;
          setExperienceData(
            Object.entries(experienceCounts).map(([range, count]) => ({
              range,
              count,
              percentage: Math.round((count / total) * 100)
            }))
          );
        } else {
          setExperienceData([]);
        }

        // Gender aggregation
        const genderCounts = (rows || []).reduce((acc, r) => {
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
        const deptCounts = (rows || []).reduce((acc, r) => {
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
          { range: '0–2 Years', count: 20, percentage: 20 },
          { range: '2–5 Years', count: 33, percentage: 33 },
          { range: '5–10 Years', count: 27, percentage: 27 },
          { range: '10+ Years', count: 20, percentage: 20 }
        ]);
        setGenderData([]);
        setDepartmentData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedView]); // Re-fetch when selectedView changes

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 px-6 pb-4">
      {/* Gender Pie Chart (30%) */}
      <div className="w-full lg:w-[30%] bg-white rounded-lg shadow-sm p-2 border border-gray-200 border-opacity-60">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Gender Distribution
        </h2>
        <div className="h-48">
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {genderData.map((entry, index) => (
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
                <Legend 
                  iconType="circle"
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
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
      <div className="w-full lg:w-[40%] bg-white rounded-lg shadow-sm p-2 border border-gray-200 border-opacity-60">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Applications by Department
        </h2>
        <div className="h-48">
          {departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={departmentData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
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
          ) : (
            <p className="text-sm text-gray-500">No department data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}