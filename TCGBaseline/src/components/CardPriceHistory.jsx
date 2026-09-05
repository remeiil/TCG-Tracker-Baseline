import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const API_BASE_URL = 'http://192.168.1.20:3000';

export default function CardPriceHistory({ cardId, cardName }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cardId) return;

    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${cardId}/history`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || 'Failed to fetch price history.');
        setHistoryData(json.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [cardId]);

  // Custom tooltip to display price and date on hover
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '0.5rem 0.75rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>${dataPoint.price}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{dataPoint.date}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Source: {dataPoint.source}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div>Loading chart history...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (historyData.length === 0) return <div>No price history recorded for this card yet.</div>;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '1rem 0' }}>
      <h3>{cardName ? `${cardName} Price History` : 'Price History'}</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#28a745" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#28a745" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(val) => `$${val}`} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="priceNumeric"
              stroke="#28a745"
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}