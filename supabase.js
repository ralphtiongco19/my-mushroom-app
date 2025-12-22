import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://toorvgiehomhdycemphy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb3J2Z2llaG9taGR5Y2VtcGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzkxMTksImV4cCI6MjA4MTc1NTExOX0.TQq6wHKUHVs0rwrJFf_cBhAYpHPiGEYC84koUCMGxog'
);
