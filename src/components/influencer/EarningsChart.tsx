import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface EarningsChartProps {
  data: Array<{ month: string; earnings: number }>;
}

export function EarningsChart({ data }: EarningsChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="earningsGradientPro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Subtle grid */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.5}
            vertical={false}
          />
          
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ 
              fontSize: 11, 
              fill: 'hsl(var(--muted-foreground))',
              fontWeight: 500
            }}
            dy={10}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ 
              fontSize: 11, 
              fill: 'hsl(var(--muted-foreground))',
              fontWeight: 500
            }}
            tickFormatter={(value) => `$${value}`}
            width={50}
            dx={-5}
          />
          
          <Tooltip 
            contentStyle={{ 
              background: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              padding: '12px 16px',
            }}
            labelStyle={{
              color: 'hsl(var(--muted-foreground))',
              fontSize: '12px',
              marginBottom: '4px',
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
              fontSize: '14px',
              fontWeight: 600,
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          
          <Area
            type="monotone"
            dataKey="earnings"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#earningsGradientPro)"
            dot={false}
            activeDot={{
              r: 6,
              stroke: 'hsl(var(--primary))',
              strokeWidth: 2,
              fill: 'hsl(var(--background))',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
