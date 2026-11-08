import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface OeeGaugeChartProps {
  oee: number; // 0–100
  size?: number;
}

function getColor(oee: number): string {
  if (oee >= 85) return '#10B981';
  if (oee >= 65) return '#F59E0B';
  return '#EF4444';
}

function getLabel(oee: number): string {
  if (oee >= 85) return 'Excelente';
  if (oee >= 65) return 'Aceitável';
  return 'Crítico';
}

export const OeeGaugeChart: React.FC<OeeGaugeChartProps> = ({ oee, size = 180 }) => {
  const color = getColor(oee);
  const data = [{ value: oee, fill: color }];

  return (
    <div className="relative flex flex-col items-center">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <RadialBar
              background={{ fill: '#1F2937' }}
              dataKey="value"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ marginTop: size * 0.08 }}
        >
          <span className="text-3xl font-black" style={{ color }}>
            {oee.toFixed(1)}%
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">OEE</span>
          <span className="text-xs font-semibold mt-0.5" style={{ color }}>
            {getLabel(oee)}
          </span>
        </div>
      </div>
    </div>
  );
};

