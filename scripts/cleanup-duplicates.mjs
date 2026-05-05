import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://klsdkptyfpnlkonrvxvk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TREE_ID = '98f77a5e-5414-4d75-b163-8f83ac00454c'

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  const { data: all } = await supabase
    .from('persons')
    .select('id, full_name, created_at')
    .eq('tree_id', TREE_ID)
    .order('full_name')
    .order('created_at')

  console.log(`Total persons: ${all.length}`)
  
  // Group by name to find duplicates
  const byName = {}
  for (const p of all) {
    if (!byName[p.full_name]) byName[p.full_name] = []
    byName[p.full_name].push(p)
  }

  const duplicatesToDelete = []
  for (const [name, persons] of Object.entries(byName)) {
    if (persons.length > 1) {
      console.log(`Duplicate: ${name} (${persons.length}x) — keeping ${persons[0].id}`)
      // Keep earliest created, delete the rest
      for (let i = 1; i < persons.length; i++) {
        duplicatesToDelete.push(persons[i].id)
      }
    }
  }

  if (duplicatesToDelete.length === 0) {
    console.log('No duplicates found!')
    return
  }

  console.log(`\nDeleting ${duplicatesToDelete.length} duplicate persons...`)
  const { error } = await supabase
    .from('persons')
    .delete()
    .in('id', duplicatesToDelete)

  if (error) { console.error('Delete error:', error); process.exit(1) }
  console.log('Duplicates cleaned up!')

  // Verify final count
  const { data: final } = await supabase
    .from('persons')
    .select('id, full_name')
    .eq('tree_id', TREE_ID)
    .order('full_name')
  
  console.log(`\nFinal persons (${final.length}):`)
  final.forEach(p => console.log(`  ${p.full_name}`))
}

main()
