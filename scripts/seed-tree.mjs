import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://klsdkptyfpnlkonrvxvk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TREE_ID = '98f77a5e-5414-4d75-b163-8f83ac00454c'

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

// Use service role to bypass RLS for seeding
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  // 1. Get existing persons
  const { data: existing, error: fetchErr } = await supabase
    .from('persons')
    .select('id, full_name')
    .eq('tree_id', TREE_ID)

  if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1) }
  console.log('Existing persons:')
  existing.forEach(p => console.log(`  ${p.id} => ${p.full_name}`))

  const byName = Object.fromEntries(existing.map(p => [p.full_name, p.id]))
  
  // Existing IDs
  const JOHN = byName['John Smith']
  const MARY = byName['Mary Smith']
  const ROBERT = byName['Robert Smith']
  const MICHAEL = byName['Michael Smith']
  const SARAH = byName['Sarah Smith']
  const JAMES = byName['James Smith']
  const EMMA = byName['Emma Smith']
  
  console.log('\nKey IDs:', { JOHN, MARY, ROBERT, MICHAEL, SARAH, JAMES, EMMA })

  // 2. Insert new persons
  const newPersons = [
    // Gen -1: Robert's wife
    { tree_id: TREE_ID, full_name: 'Dorothy Smith', gender: 'female' },
    // Gen 1 spouses
    { tree_id: TREE_ID, full_name: 'Lisa Johnson', gender: 'female' },
    { tree_id: TREE_ID, full_name: 'David Brown', gender: 'male' },
    { tree_id: TREE_ID, full_name: 'Emily Davis', gender: 'female' },  // James's wife
    // Gen 2 children
    { tree_id: TREE_ID, full_name: 'Noah Smith', gender: 'male' },
    { tree_id: TREE_ID, full_name: 'Olivia Smith', gender: 'female' },
    { tree_id: TREE_ID, full_name: 'Ethan Brown', gender: 'male' },
    { tree_id: TREE_ID, full_name: 'Sophie Brown', gender: 'female' },
    { tree_id: TREE_ID, full_name: 'Liam Smith', gender: 'male' },   // James & Emily's child
    // Gen -2: Robert's parent
    { tree_id: TREE_ID, full_name: 'George Smith', gender: 'male' },
    { tree_id: TREE_ID, full_name: 'Martha Smith', gender: 'female' }, // George's wife
    // Gen 3 - Emma's child
    { tree_id: TREE_ID, full_name: 'Aria Smith', gender: 'female' },
  ]

  const { data: inserted, error: insertErr } = await supabase
    .from('persons')
    .insert(newPersons)
    .select('id, full_name')

  if (insertErr) { console.error('Insert error:', insertErr); process.exit(1) }
  console.log('\nInserted persons:')
  inserted.forEach(p => console.log(`  ${p.id} => ${p.full_name}`))

  const n = Object.fromEntries(inserted.map(p => [p.full_name, p.id]))
  const DOROTHY = n['Dorothy Smith']
  const LISA = n['Lisa Johnson']
  const DAVID = n['David Brown']
  const EMILY = n['Emily Davis']
  const NOAH = n['Noah Smith']
  const OLIVIA = n['Olivia Smith']
  const ETHAN = n['Ethan Brown']
  const SOPHIE = n['Sophie Brown']
  const LIAM = n['Liam Smith']
  const GEORGE = n['George Smith']
  const MARTHA = n['Martha Smith']
  const ARIA = n['Aria Smith']

  // Helper to make a relationship record
  const rel = (from, to, type, en) => ({
    tree_id: TREE_ID,
    from_person_id: from,
    to_person_id: to,
    relation_type: type,
    relation_en: en,
  })

  // 3. Insert relationships
  const relationships = [
    // Gen -2: George & Martha couple
    rel(GEORGE, MARTHA, 'spouse', 'Wife'),
    rel(MARTHA, GEORGE, 'spouse', 'Husband'),
    // George & Martha are parents of Robert
    rel(GEORGE, ROBERT, 'parent', 'Son'),
    rel(MARTHA, ROBERT, 'parent', 'Son'),
    rel(ROBERT, GEORGE, 'child', 'Father'),
    rel(ROBERT, MARTHA, 'child', 'Mother'),
    
    // Gen -1: Robert & Dorothy couple
    rel(ROBERT, DOROTHY, 'spouse', 'Wife'),
    rel(DOROTHY, ROBERT, 'spouse', 'Husband'),
    // Robert & Dorothy are parents of John
    rel(DOROTHY, JOHN, 'parent', 'Son'),
    rel(JOHN, DOROTHY, 'child', 'Mother'),
    
    // Gen 1 spouses
    rel(MICHAEL, LISA, 'spouse', 'Wife'),
    rel(LISA, MICHAEL, 'spouse', 'Husband'),
    rel(SARAH, DAVID, 'spouse', 'Husband'),
    rel(DAVID, SARAH, 'spouse', 'Wife'),
    rel(JAMES, EMILY, 'spouse', 'Wife'),
    rel(EMILY, JAMES, 'spouse', 'Husband'),
    
    // Gen 2 children of Michael & Lisa
    rel(MICHAEL, NOAH, 'parent', 'Son'),
    rel(LISA, NOAH, 'parent', 'Son'),
    rel(NOAH, MICHAEL, 'child', 'Father'),
    rel(NOAH, LISA, 'child', 'Mother'),
    rel(MICHAEL, OLIVIA, 'parent', 'Daughter'),
    rel(LISA, OLIVIA, 'parent', 'Daughter'),
    rel(OLIVIA, MICHAEL, 'child', 'Father'),
    rel(OLIVIA, LISA, 'child', 'Mother'),
    
    // Gen 2 children of Sarah & David
    rel(SARAH, ETHAN, 'parent', 'Son'),
    rel(DAVID, ETHAN, 'parent', 'Son'),
    rel(ETHAN, SARAH, 'child', 'Mother'),
    rel(ETHAN, DAVID, 'child', 'Father'),
    rel(SARAH, SOPHIE, 'parent', 'Daughter'),
    rel(DAVID, SOPHIE, 'parent', 'Daughter'),
    rel(SOPHIE, SARAH, 'child', 'Mother'),
    rel(SOPHIE, DAVID, 'child', 'Father'),
    
    // Gen 2 child of James & Emily
    rel(JAMES, LIAM, 'parent', 'Son'),
    rel(EMILY, LIAM, 'parent', 'Son'),
    rel(LIAM, JAMES, 'child', 'Father'),
    rel(LIAM, EMILY, 'child', 'Mother'),
    
    // Gen 3: Emma's child (Aria)
    rel(EMMA, ARIA, 'parent', 'Daughter'),
    rel(ARIA, EMMA, 'child', 'Mother'),
  ]

  const { error: relErr } = await supabase
    .from('relationships')
    .insert(relationships)

  if (relErr) { console.error('Relationship insert error:', relErr); process.exit(1) }
  console.log(`\nInserted ${relationships.length} relationships successfully!`)
  console.log('\nFinal tree now has:')
  console.log('  Gen -2: George & Martha Smith (great-grandparents)')
  console.log('  Gen -1: Robert & Dorothy Smith (grandparents)')
  console.log('  Gen 0:  John & Mary Smith (parents)')
  console.log('  Gen 1:  Michael+Lisa, Sarah+David, James+Emily (children + spouses)')
  console.log('  Gen 2:  Noah, Olivia (Michael\'s), Ethan, Sophie (Sarah\'s), Liam (James\'s), Emma (existing)')
  console.log('  Gen 3:  Aria (Emma\'s child)')
}

main()
