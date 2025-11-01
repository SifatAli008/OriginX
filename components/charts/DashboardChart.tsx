"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import recharts components - client-side only
let ResponsiveContainer: any, AreaChart: any, LineChart: any, Area: any, Line: any;
let XAxis: any, YAxis: any, CartesianGrid: any, Tooltip: any, Legend: any;

if (typeof window !== 'undefined') {
  const recharts = require('recharts');
  ResponsiveContainer = recharts.ResponsiveContainer;
  AreaChart = recharts.AreaChart;
  LineChart = recharts.LineChart;
  Area = recharts.Area;
  Line = recharts.Line;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  Legend = recharts.Legend;
}

interface ChartDataPoint {
  date: string;
  revenue?: number;
  transactions?: number;
  users?: number;
  apiCalls?: number;
}

interface DashboardChartProps {
  data: ChartDataPoint[];
  type: "area" | "line";
  title: string;
  description?: string;
  height?: number;
  dataKeys: Array<{
    key: string;
    color: string;
    name: string;
    isArea?: boolean;
  }>;
}

export default function DashboardChart({
  data,
  type,
  title,
  description,
  height = 300,
  dataKeys,
}: DashboardChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ChartComponent = type === "area" ? AreaChart : LineChart;

  if (!mounted || typeof window === 'undefined') {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
          {description && <CardDescription className="text-gray-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="w-8 h-8 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
        {description && <CardDescription className="text-gray-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data}>
            {type === "area" && (
              <defs>
                {dataKeys
                  .filter(({ isArea }) => isArea === true || isArea === undefined)
                  .map(({ key, color }) => (
                    <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
              </defs>
            )}
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af" }} />
            {dataKeys.map(({ key, color, name, isArea }) => {
              // If type is "area" and isArea is true or undefined, use Area. If isArea is false, use Line.
              // If type is "line", always use Line.
              const useArea = type === "area" && (isArea === true || isArea === undefined);
              
              if (useArea) {
                return (
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
                );
              }
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={name}
                />
              );
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

