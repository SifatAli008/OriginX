"use client";

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
  users: number;
  apiCalls: number;
}

interface LineChartWrapperProps {
  data: ChartData[];
  type?: "line" | "area";
  dataKeys: Array<{ key: string; color: string; name: string; strokeWidth?: number }>;
  height?: number;
  title?: string;
  description?: string;
}

export default function LineChartWrapper({ 
  data, 
  type = "line", 
  dataKeys, 
  height = 300,
  title: _title, // eslint-disable-line @typescript-eslint/no-unused-vars
  description: _description // eslint-disable-line @typescript-eslint/no-unused-vars 
}: LineChartWrapperProps) {
  const [mounted] = useState(() => typeof window !== 'undefined');

  if (!mounted) {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const chartContent = type === "area" ? (
    <AreaChart data={data}>
      <defs>
        {dataKeys.map(({ key, color }) => (
          <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#1f2937', 
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#fff'
        }} 
      />
      <Legend wrapperStyle={{ color: '#9ca3af' }} />
      {dataKeys.map(({ key, color, name }) => (
        <Area 
          key={key}
          type="monotone" 
          dataKey={key} 
          stroke={color} 
          fillOpacity={1} 
          fill={`url(#color${key})`}
          strokeWidth={2}
          name={name}
        />
      ))}
    </AreaChart>
  ) : (
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#1f2937', 
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#fff'
        }} 
      />
      <Legend wrapperStyle={{ color: '#9ca3af' }} />
      {dataKeys.map(({ key, color, name, strokeWidth = 2 }) => (
        <Line 
          key={key}
          type="monotone" 
          dataKey={key} 
          stroke={color} 
          strokeWidth={strokeWidth}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          name={name}
        />
      ))}
    </LineChart>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {chartContent}
    </ResponsiveContainer>
  );
}

