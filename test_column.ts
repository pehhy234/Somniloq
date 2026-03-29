import { supabase } from './src/lib/supabase'

async function testColumn() {
  const { error } = await supabase.from('conversations').select('model_id').limit(1)
  if (error && error.message.includes('does not exist')) {
    console.log('COLUMN_ABSENT')
  } else if (error) {
    console.log('OTHER_ERROR:', error)
  } else {
    console.log('COLUMN_PRESENT')
  }
}

testColumn()
