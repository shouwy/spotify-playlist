import React, { useEffect, useState, useRef } from 'react';
import { callGetMetrics } from '../utils/api.js';

export default function AdminMetricsPage(){
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchMetrics(){
    setLoading(true); setError(null);
    try{
      const m = await callGetMetrics();
      setMetrics(m);
    }catch(e){ setError(e.message || String(e)); }
    setLoading(false);
  }

  const loadedRef = useRef(false);
  useEffect(()=>{
    if(loadedRef.current) return;
    loadedRef.current = true;
    fetchMetrics();
    const id = setInterval(fetchMetrics, 30_000);
    return ()=>clearInterval(id);
  },[]);

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Métriques du worker (Admin)</h2>
      {error && <div className="text-red-600">{error}</div>}
      {loading && !metrics && <div>Chargement...</div>}
      {metrics && (
        <table className="table-auto border-collapse">
          <tbody>
            <tr><td className="p-2">Cron runs</td><td className="p-2">{metrics['worker:cron_run_count'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Cron skipped (empty queue)</td><td className="p-2">{metrics['worker:cron_run_skipped'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Cron processed</td><td className="p-2">{metrics['worker:cron_run_processed'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Trigger calls</td><td className="p-2">{metrics['worker:signal_count'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Jobs succeeded</td><td className="p-2">{metrics['worker:jobs_succeeded'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Jobs failed</td><td className="p-2">{metrics['worker:jobs_failed'] ?? 'n/a'}</td></tr>
            <tr><td className="p-2">Queue length</td><td className="p-2">{metrics.generate_queue_length ?? 'n/a'}</td></tr>
            {metrics.recent_job_durations_avg && <tr><td className="p-2">Avg job duration</td><td className="p-2">{Math.round(metrics.recent_job_durations_avg)} ms</td></tr>}
          </tbody>
        </table>
      )}
      <div className="mt-3">
        <button onClick={fetchMetrics} disabled={loading} className="px-3 py-1 bg-gray-200 rounded">{loading ? 'Rafraîchissement...' : 'Rafraîchir'}</button>
      </div>
    </div>
  );
}
