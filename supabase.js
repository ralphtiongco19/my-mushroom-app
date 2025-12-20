// supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://toorvgiehomhdycemphy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3J2Z2llaG9taGR5Y2VtcGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzkxMTksImV4cCI6MjA4MTc1NTExOX0.TQq6wHKUHVs0rwrJFf_cBhAYpHPiGEYC84koUCMGxog';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
