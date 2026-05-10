const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function checkData() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'Hamzahadjtaieb@gmail.com',
    password: 'Test!123'
  });
  
  if (authError) {
    console.log('Auth Error:', authError);
    return;
  }
  
  console.log('Signed in as:', authData.user.id);
  const { data: trips } = await supabase.from('trips').select('*');
  console.log('Trips:', trips);

  const { data: activities } = await supabase.from('activities').select('*');
  console.log('Activities count:', activities?.length);
}

checkData();
