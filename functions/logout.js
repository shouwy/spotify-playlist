exports.handler = async function(event){
  try{
    // clear the spotify_refresh_id cookie
    const cookie = 'spotify_refresh_id=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=None';
    return { 
      statusCode: 200, 
      headers: { 'Set-Cookie': cookie },
      body: JSON.stringify({ ok: true })
    };
  }catch(err){
    console.error('logout error', err?.message || err);
    return { statusCode: 500, body: 'logout error' };
  }
};
