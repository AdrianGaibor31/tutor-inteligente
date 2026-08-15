import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fozgeadexnwpwmwspujl.supabase.co'      // tu URL de Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemdlYWRleG53cHdtd3NwdWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzU1MTQsImV4cCI6MjA5ODMxMTUxNH0.tJoKV-eKrNZ4-2BMyCTTuk8_xmu9N_tKz7mOTFsNgTs'                          // tu anon key

export const supabase = createClient(supabaseUrl, supabaseKey)