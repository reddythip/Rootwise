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
  const { data: persons } = await supabase
    .from('persons')
    .select('id, full_name')
    .eq('tree_id', TREE_ID)

  const n = Object.fromEntries(persons.map(p => [p.full_name, p.id]))
  console.log('Persons:', Object.keys(n).sort().join(', '))

  const { JOHN='', MARY='', ROBERT='', MICHAEL='', SARAH='', JAMES='', EMMA='' } = {
    JOHN: n['John Smith'], MARY: n['Mary Smith'], ROBERT: n['Robert Smith'],
    MICHAEL: n['Michael Smith'], SARAH: n['Sarah Smith'],
    JAMES: n['James Smith'], EMMA: n['Emma Smith']
  }
  const { DOROTHY='', LISA='', DAVID='', EMILY='' } = {
    DOROTHY: n['Dorothy Smith'], LISA: n['Lisa Johnson'],
    DAVID: n['David Brown'], EMILY: n['Emily Davis']
  }
  const { NOAH='', OLIVIA='', ETHAN='', SOPHIE='', LIAM='', ARIA='' } = {
    NOAH: n['Noah Smith'], OLIVIA: n['Olivia Smith'],
    ETHAN: n['Ethan Brown'], SOPHIE: n['Sophie Brown'],
    LIAM: n['Liam Smith'], ARIA: n['Aria Smith']
  }
  const { GEORGE='', MARTHA='' } = { GEORGE: n['George Smith'], MARTHA: n['Martha Smith'] }

  const rel = (from, to, type, en) => ({
    tree_id: TREE_ID, from_person_id: from, to_person_id: to, relation_type: type, relation_en: en
  })

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
    rel(ROBERT, JOHN, 'parent', 'Son'),
    rel(DOROTHY, JOHN, 'parent', 'Son'),
    rel(JOHN, ROBERT, 'child', 'Father'),
    rel(JOHN, DOROTHY, 'child', 'Mother'),

    // Gen 0: John & Mary spouse
    rel(JOHN, MARY, 'spouse', 'Wife'),
    rel(MARY, JOHN, 'spouse', 'Husband'),
    // John & Mary are parents of Michael, Sarah, James
    rel(JOHN, MICHAEL, 'parent', 'Son'),
    rel(MARY, MICHAEL, 'parent', 'Son'),
    rel(MICHAEL, JOHN, 'child', 'Father'),
    rel(MICHAEL, MARY, 'child', 'Mother'),
    rel(JOHN, SARAH, 'parent', 'Daughter'),
    rel(MARY, SARAH, 'parent', 'Daughter'),
    rel(SARAH, JOHN, 'child', 'Father'),
    rel(SARAH, MARY, 'child', 'Mother'),
    rel(JOHN, JAMES, 'parent', 'Son'),
    rel(MARY, JAMES, 'parent', 'Son'),
    rel(JAMES, JOHN, 'child', 'Father'),
    rel(JAMES, MARY, 'child', 'Mother'),

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

    // Gen 2 children of James & Emily (Emma + Liam)
    rel(JAMES, EMMA, 'parent', 'Daughter'),
    rel(EMILY, EMMA, 'parent', 'Daughter'),
    rel(EMMA, JAMES, 'child', 'Father'),
    rel(EMMA, EMILY, 'child', 'Mother'),
    rel(JAMES, LIAM, 'parent', 'Son'),
    rel(EMILY, LIAM, 'parent', 'Son'),
    rel(LIAM, JAMES, 'child', 'Father'),
    rel(LIAM, EMILY, 'child', 'Mother'),

    // Gen 3: Emma's child (Aria)
    rel(EMMA, ARIA, 'parent', 'Daughter'),
    rel(ARIA, EMMA, 'child', 'Mother'),
  ]

  console.log(`\nInserting ${relationships.length} relationships...`)
  const { error } = await supabase.from('relationships').insert(relationships)
  if (error) { console.error('Error:', error.message, error.details); process.exit(1) }
  console.log('All relationships inserted successfully!')
  console.log('\nTree structure:')
  console.log('  Gen -2: George & Martha Smith')
  console.log('  Gen -1: Robert & Dorothy Smith')
  console.log('  Gen  0: John & Mary Smith')
  console.log('  Gen  1: Michael+Lisa, Sarah+David, James+Emily')
  console.log('  Gen  2: Noah, Olivia / Ethan, Sophie / Emma, Liam')
  console.log('  Gen  3: Aria')
}

main()
