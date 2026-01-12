import React, { useState, useEffect } from 'react';
import { callClearQueue, callForceJob, callGetMetrics, callGetUserJobs, callGetAllJobs } from '../utils/api.js';

function Toast({ msg, onClose }){
  useEffect(()=>{ const t = setTimeout(onClose, 3500); return ()=>clearTimeout(t); }, [onClose]);
  return <div className="toast">{msg}</div>;
}

export default function AdminPage(){
  const [toast, setToast] = useState(null);
  const [jobId, setJobId] = useState('');
  const [running, setRunning] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);

  async function clearQueue(){
    if(!window.confirm('Vider la file generate_queue ? Cette action est irréversible.')) return;
    setRunning(true);
    try{
      const res = await callClearQueue();
      setToast(`Queue vidée: ${res.removed} jobs supprimés`);
      await refreshMetrics();
      await refreshJobs();
    }catch(e){ setToast('Erreur: '+e.message); }
    setRunning(false);
  }

  async function forceJob(){
    if(!jobId) return setToast('Donnez un jobId');
    setRunning(true);
    try{
      const res = await callForceJob(jobId.trim());
      setToast(`Job ${res.jobId} requeued.`);
      setJobId('');
      await refreshMetrics();
      await refreshJobs();
    }catch(e){ setToast('Erreur: '+e.message); }
    setRunning(false);
  }

  async function forceJobClick(id){
    if(!window.confirm('Forcer ce job ?')) return;
    setJobId(id);
    setRunning(true);
    try{
      const res = await callForceJob(id);
      setToast(`Job ${res.jobId} requeued.`);
      setJobId('');
      await refreshMetrics();
      await refreshJobs();
    }catch(e){ setToast('Erreur: '+e.message); }
    setRunning(false);
  }

  async function refreshMetrics(){
    try{ const m = await callGetMetrics(); setMetrics(m); }catch(e){ console.warn(e); }
  }

  async function refreshJobs(){
    try{
      // if backend supports get_all_jobs (admin-only) use it, otherwise fallback to user jobs
      const res = await callGetAllJobs().catch(()=> null) || await callGetUserJobs().catch(()=> ({ jobs: [] }));
      setJobs(res.jobs || []);
    }catch(e){ console.warn(e); }
  }

  const loadedRef = React.useRef(false);
  useEffect(()=>{
    if(loadedRef.current) return;
    loadedRef.current = true;
    refreshMetrics();
    refreshJobs();
  }, []);

  const durations = (metrics?.recent_job_durations || []).filter(d=>typeof d === 'number');
  const maxDuration = Math.max(...durations, 1);

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Admin — File & Jobs</h2>
      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
      <div className="mb-4">
        <h3 className="font-semibold">Actions</h3>
        <div className="mb-2">
          <button onClick={clearQueue} disabled={running} className="bg-red-600 text-white px-3 py-1 rounded">Vider la file</button>
        </div>
        <div className="mb-3">
          <input placeholder="job id" value={jobId} onChange={e=>setJobId(e.target.value)} className="w-72 mr-2 px-2 border rounded" />
          <button onClick={forceJob} disabled={running || !jobId} className="px-3 py-1 bg-blue-600 text-white rounded">Forcer job</button>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Métriques</h3>
        <button onClick={refreshMetrics} className="mb-2 px-3 py-1 bg-gray-200 rounded">Rafraîchir</button>
        {metrics && (
          <div>
            <div>Queue length: {metrics.generate_queue_length}</div>
            <div>Jobs succeeded: {metrics['worker:jobs_succeeded'] || 0}</div>
            <div>Jobs failed: {metrics['worker:jobs_failed'] || 0}</div>
            {metrics.recent_job_durations_avg && <div>Avg job duration: {metrics.recent_job_durations_avg} ms</div>}
          </div>
        )}
      </div>
      {durations.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Durées récentes (ms)</h3>
          <div className="flex items-end gap-1 h-24">
            {durations.slice(0, 30).map((d, i)=>(
              <div key={i} title={Math.round(d)+'ms'} className="flex-1 metric-bar" style={{ height: (d/maxDuration)*100 + '%' }}></div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <h3 className="font-semibold">Vos jobs ({jobs.length})</h3>
        <button onClick={refreshJobs} className="mb-2 px-3 py-1 bg-gray-200 rounded">Rafraîchir</button>
        <ul className="list-none p-0">
          {jobs.map(j=>(
            <li key={j.id} className="p-2 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-semibold"><a href={`/job?id=${j.id}`} className="text-blue-600 no-underline">{j.id}</a></div>
                <div className="text-sm">Status: {j.status} | Created: {j.created_at ? new Date(j.created_at).toLocaleString() : 'n/a'}</div>
                {j.duration && <div className="text-sm">Durée: {j.duration} ms</div>}
                {j.error && <div className="text-sm text-red-600">Erreur: {j.error}</div>}
              </div>
              <button onClick={()=>forceJobClick(j.id)} className="px-2 py-1 bg-gray-200 rounded">Force</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
