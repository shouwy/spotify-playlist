export async function callGenerate(body){
  const res = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'generate failed');
  }
  return res.json();
}

export async function callEnqueue(body){
  const res = await fetch('/.netlify/functions/generate_enqueue', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || 'enqueue failed');
  }
  return res.json();
}

export async function callGetJob(id){
  const res = await fetch(`/.netlify/functions/get_job?id=${encodeURIComponent(id)}`, { credentials: 'include' });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || 'get_job failed');
  }
  return res.json();
}

export async function callProcessJob(){
  const res = await fetch('/.netlify/functions/generate_trigger', { method: 'POST', credentials: 'include' });
  const text = await res.text();
  if(!res.ok){ throw new Error(text || 'trigger failed'); }
  try{ return text ? JSON.parse(text) : { ok: true }; }catch(e){ return { ok: true, raw: text }; }
}

export async function callCreatePlaylist(body){
  const res = await fetch('/.netlify/functions/create_playlist', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || 'create_playlist failed');
  }
  return res.json();
}

export async function callGetMetrics(){
  const res = await fetch('/.netlify/functions/metrics', { credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'metrics fetch failed'); }
  return res.json();
}

export async function callGetLastJob(){
  const res = await fetch('/.netlify/functions/get_last_job', { credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'get_last_job failed'); }
  return res.json();
}

export async function callClearQueue(){
  const res = await fetch('/.netlify/functions/clear_queue', { method: 'POST', credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'clear_queue failed'); }
  return res.json();
}

export async function callForceJob(jobId){
  const res = await fetch('/.netlify/functions/force_job', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'force_job failed'); }
  return res.json();
}

export async function callGetUserJobs(){
  const res = await fetch('/.netlify/functions/get_user_jobs', { credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'get_user_jobs failed'); }
  return res.json();
}

export async function callGetAllJobs(){
  const res = await fetch('/.netlify/functions/get_all_jobs', { credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'get_all_jobs failed'); }
  return res.json();
}

export async function callAdminRequest(){
  const res = await fetch('/.netlify/functions/admin_request', { method: 'POST', credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'admin_request failed'); }
  return res.json();
}

export async function callAdminListUsers(){
  const res = await fetch('/.netlify/functions/admin_list_users', { credentials: 'include' });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'admin_list_users failed'); }
  return res.json();
}

export async function callAdminUpdateRole(body){
  const res = await fetch('/.netlify/functions/admin_update_role', { method: 'POST', credentials: 'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'admin_update_role failed'); }
  return res.json();
}