import React from 'react';
import type { IdeologyRadar } from '../types/philosopher';

interface RadarChartProps {
  data: IdeologyRadar;
  color?: string;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  color = '#a855f7',
  size = 200
}) => {
  const center = size / 2;
  const radius = (size / 2) * 0.72;
  const axes = [
    { label: '理性/逻辑', val: data.rationality },
    { label: '自由/个体', val: data.freedom },
    { label: '平等/群体', val: data.equality },
    { label: '秩序/传统', val: data.tradition },
    { label: '变革/批判', val: data.revolution }
  ];

  const totalAxes = axes.length;

  // Calculate coordinates for polygon points
  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Web polygon points (100%, 75%, 50%, 25%)
  const gridLevels = [1, 0.75, 0.5, 0.25];

  // Data polygon points
  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.val);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Grid */}
        {gridLevels.map((level, idx) => {
          const points = axes
            .map((_, i) => {
              const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
              const r = radius * level;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={idx}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
              strokeDasharray={idx % 2 === 1 ? '3 3' : undefined}
            />
          );
        })}

        {/* Axis Lines */}
        {axes.map((_, i) => {
          const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={polygonPoints}
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="2.5"
          filter="drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))"
        />

        {/* Data Vertices */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, axis.val);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#ffffff"
              stroke={color}
              strokeWidth="2"
            />
          );
        })}

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
          const labelRadius = radius + 18;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
