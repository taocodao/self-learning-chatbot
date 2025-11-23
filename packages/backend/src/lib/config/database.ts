import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
  console.error('? Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
export const db = supabase;
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('examples').select('count').limit(1);
    if (error) {
      console.error('? Database connection failed:', error.message);
      return false;
    }
    console.log('? Database connected');
    return true;
  } catch (error) {
    console.error('? Database error:', error);
    return false;
  }
}
export default supabase;
