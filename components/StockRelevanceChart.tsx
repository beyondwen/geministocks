import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { StockTicker } from '../types';

interface StockRelevanceChartProps {
  stocks: StockTicker[];
}

const relevanceMap: { [key in 'High' | 'Medium' | 'Low']: number } = {
  'High': 3,
  'Medium': 2,
  'Low': 1,
};

const relevanceLabels: { [key: number]: string } = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const relevanceColors: { [key: number]: string } = {
    3: '#10B981', // green-500
    2: '#F59E0B', // amber-500
    1: '#EF4444', // red-500
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const relevanceValue = payload[0].value;
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
          <p className="font-bold">{`股票代码: ${label}`}</p>
          <p style={{ color: relevanceColors[relevanceValue] }}>
            {`关联度: ${relevanceLabels[relevanceValue]}`}
          </p>
        </div>
      );
    }
    return null;
};

const StockRelevanceChart: React.FC<StockRelevanceChartProps> = ({ stocks }) => {
  const chartData = useMemo(() => {
    return stocks.map(stock => ({
      name: stock.ticker,
      relevance: relevanceMap[stock.relevance],
    }));
  }, [stocks]);

  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart
            data={chartData}
            margin={{
                top: 5,
                right: 20,
                left: -10,
                bottom: 5,
            }}
            >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, 3]}
                ticks={[1, 2, 3]}
                tickFormatter={(value) => relevanceLabels[value] || ''}
                tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}/>
            <Bar dataKey="relevance">
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={relevanceColors[entry.relevance]} />
                ))}
            </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default StockRelevanceChart;
