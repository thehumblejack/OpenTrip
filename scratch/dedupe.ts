import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

async function run() {
  const { data: acts, error } = await supabase.from('activities').select('*');
  if (error) throw error;
  
  const seen = new Set();
  const toDelete = [];
  
  for (const a of acts) {
    const key = `${a.trip_id}-${a.title}-${a.date}-${a.time}-${a.location}`;
    if (seen.has(key)) {
      toDelete.push(a.id);
    } else {
      seen.add(key);
    }
  }
  
  console.log(`Found ${toDelete.length} duplicates out of ${acts.length} total activities.`);
  
  if (toDelete.length > 0) {
    // Delete in chunks
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      await supabase.from('activities').delete().in('id', chunk);
    }
    console.log('Deleted duplicates!');
  }
}
run();
