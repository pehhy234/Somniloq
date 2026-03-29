import { supabase } from './src/lib/supabase'

async function checkTable() {
  const { data, error } = await supabase.from('conversations').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Columns:', Object.keys(data?.[0] || {}))
  }
}

checkTable()
