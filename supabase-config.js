// Byt ut dessa mot dina faktiska värden från Supabase Dashboard
const SUPABASE_URL = 'https://ozvojavhcvfxrqbqtwmd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dm9qYXZoY3ZmeHJxYnF0d21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjI0MjQsImV4cCI6MjA5NjM5ODQyNH0.TGc7bjga5t_eQsOOs8nbPCcgZGrsviPCjKAlvcR0RUc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
