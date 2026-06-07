import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uiigqpivaojakxcidlty.supabase.co'
const SUPABASE_KEY = 'sb_publishable_PLpmEVrSW-MHfpqBKrdvIw_tM29hZji'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)