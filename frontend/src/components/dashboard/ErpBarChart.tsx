interface ErpBarDatum {
  label: string;
  value: number;
}

interface ErpBarChartProps {
  data: ErpBarDatum[];
  height?: number;
}

function ErpBarChart({ data, height = 190 }: ErpBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="erp-bar-chart" style={{ height }}>
      {data.map((d) => (
        <div className="erp-bar-col" key={d.label}>
          <span className="erp-bar-value">{d.value}</span>
          <div className="erp-bar-track">
            <div
              className="erp-bar-fill"
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            />
          </div>
          <span className="erp-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default ErpBarChart;