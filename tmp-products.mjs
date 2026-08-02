import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const { data, error } = await supabase.from('products').select('id,name').limit(5)
console.log('error', JSON.stringify(error, null, 2))
console.log('data', JSON.stringify(data, null, 2))