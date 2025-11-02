"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentType } from "react";

// Type definitions for recharts component props
type RechartsProps = Record<string, unknown>;

// Type definitions for recharts components
interface RechartsComponents {
  ResponsiveContainer: ComponentType<RechartsProps>;
  AreaChart: ComponentType<RechartsProps>;
  LineChart: ComponentType<RechartsProps>;
  Area: ComponentType<RechartsProps>;
  Line: ComponentType<RechartsProps>;
  XAxis: ComponentType<RechartsProps>;
  YAxis: ComponentType<RechartsProps>;
  CartesianGrid: ComponentType<RechartsProps>;
  Tooltip: ComponentType<RechartsProps>;
  Legend: ComponentType<RechartsProps>;
}

// State for loaded recharts components
let rechartsComponents: RechartsComponents | null = null;

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
  const [componentsLoaded, setComponentsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !rechartsComponents) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const recharts = require('recharts');
      rechartsComponents = {
        ResponsiveContainer: recharts.ResponsiveContainer,
        AreaChart: recharts.AreaChart,
        LineChart: recharts.LineChart,
        Area: recharts.Area,
        Line: recharts.Line,
        XAxis: recharts.XAxis,
        YAxis: recharts.YAxis,
        CartesianGrid: recharts.CartesianGrid,
        Tooltip: recharts.Tooltip,
        Legend: recharts.Legend,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComponentsLoaded(true);
    }
    setMounted(true);
  }, []);

  const ChartComponent = type === "area" 
    ? (rechartsComponents?.AreaChart ?? null)
    : (rechartsComponents?.LineChart ?? null);

  if (!mounted || typeof window === 'undefined' || !componentsLoaded || !ChartComponent || !rechartsComponents?.ResponsiveContainer) {
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
        {rechartsComponents?.ResponsiveContainer && (
          <rechartsComponents.ResponsiveContainer width="100%" height={height}>
            {ChartComponent && (
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
                {rechartsComponents.CartesianGrid && (
                  <rechartsComponents.CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                )}
                {rechartsComponents.XAxis && (
                  <rechartsComponents.XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                )}
                {rechartsComponents.YAxis && (
                  <rechartsComponents.YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                )}
                {rechartsComponents.Tooltip && (
                  <rechartsComponents.Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                )}
                {rechartsComponents.Legend && (
                  <rechartsComponents.Legend wrapperStyle={{ color: "#9ca3af" }} />
                )}
                {dataKeys.map(({ key, color, name, isArea }) => {
                  // If type is "area" and isArea is true or undefined, use Area. If isArea is false, use Line.
                  // If type is "line", always use Line.
                  const useArea = type === "area" && (isArea === true || isArea === undefined);
                  
                  if (useArea && rechartsComponents?.Area) {
                    return (
                      <rechartsComponents.Area
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
                  if (rechartsComponents?.Line) {
                    return (
                      <rechartsComponents.Line
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
                  }
                  return null;
                })}
              </ChartComponent>
            )}
          </rechartsComponents.ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

