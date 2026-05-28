const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

Promise.all([
  sb.from('users').select('id, name, email, created_at').order('id', {ascending: false}).limit(20),
  sb.from('profiles').select('user_id, lora_status, uploaded_photo_count, onboarding_complete, lora_weights_url, lora_trigger_phrase').order('user_id', {ascending: false}).limit(20),
  sb.from('credits').select('user_id, credits_remaining').order('user_id', {ascending: false}).limit(20),
]).then(([users, profiles, credits]) => {
  const profileMap = {};
  (profiles.data || []).forEach(p => { profileMap[p.user_id] = p; });
  const creditMap = {};
  (credits.data || []).forEach(c => { creditMap[c.user_id] = c; });

  const result = (users.data || []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    joined: u.created_at,
    profile: profileMap[u.id] ? {
      lora_status: profileMap[u.id].lora_status,
      photo_count: profileMap[u.id].uploaded_photo_count,
      onboarding_complete: profileMap[u.id].onboarding_complete,
      has_weights: !!profileMap[u.id].lora_weights_url,
      has_trigger: !!profileMap[u.id].lora_trigger_phrase,
    } : null,
    credits: creditMap[u.id] ? creditMap[u.id].credits_remaining : null,
  }));
  console.log(JSON.stringify(result, null, 2));
}).catch(e => console.error(e));
