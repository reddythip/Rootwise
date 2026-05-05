import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification, getTreeMemberIds } from '@/lib/notifications/service'
import { z } from 'zod'

const AddMemberSchema = z.object({
  tree_id: z.string().uuid(),
  from_person_id: z.string().uuid().nullish(),
  // Person data
  full_name: z.string().min(1).max(200),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).nullish(),
  birth_year: z.number().int().min(1000).max(2100).nullish(),
  birth_date: z.string().nullish(),
  birth_place: z.string().max(200).nullish(),
  death_date: z.string().nullish(),
  is_deceased: z.boolean().default(false),
  photo_url: z.string().url().nullish(),
  bio: z.string().max(2000).nullish(),
  hometown: z.string().max(200).nullish(),
  current_location: z.string().max(200).nullish(),
  // Relationship data
  relation_type: z.enum([
    'spouse','child','parent','sibling','grandparent','grandchild',
    'aunt_uncle','niece_nephew','cousin','step_parent','step_child',
    'step_sibling','half_sibling','adopted_child','godparent','godchild','in_law','other'
  ]).nullish(),
  relation_en: z.string().max(100).nullish(),
  relation_native: z.string().max(200).nullish(),
  relation_romanized: z.string().max(200).nullish(),
  language_code: z.string().max(10).nullish(),
  marriage_status: z.enum(['married','partnered','divorced','widowed','separated','unknown']).nullish(),
  married_date: z.string().nullish(),
  child_type: z.enum(['biological','adopted','step']).nullish(),
  sibling_type: z.enum(['full','half','step']).nullish(),
  // Invite
  send_invite: z.boolean().default(false),
  invite_email: z.string().email().nullish(),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate body
  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const result = AddMemberSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', details: result.error.flatten() }, { status: 422 })
  }

  const data = result.data

  // Check user can edit this tree (RLS will also enforce, this is belt-and-suspenders)
  const { data: membership } = await supabase
    .from('tree_members')
    .select('role')
    .eq('tree_id', data.tree_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner','admin','editor'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  // Check plan limits
  const { data: tree } = await supabase
    .from('trees')
    .select('member_count')
    .eq('id', data.tree_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const maxMembers = profile?.plan === 'premium' ? 5000 : 50
  if ((tree?.member_count || 0) >= maxMembers) {
    return NextResponse.json(
      { error: `Member limit reached. Upgrade to premium to add more than ${maxMembers} members.` },
      { status: 402 }
    )
  }

  // Insert person
  const { data: person, error: personError } = await supabase
    .from('persons')
    .insert({
      tree_id: data.tree_id,
      full_name: data.full_name,
      gender: data.gender || null,
      birth_year: data.birth_year || null,
      birth_date: data.birth_date || null,
      birth_place: data.birth_place || null,
      death_date: data.death_date || null,
      is_deceased: data.is_deceased,
      is_living: !data.is_deceased,
      bio: data.bio || null,
      hometown: data.hometown || null,
      current_location: data.current_location || null,
      photo_url: data.photo_url || null,
      added_by: user.id,
    })
    .select()
    .single()

  if (personError || !person) {
    console.error('[members] Insert person error:', personError)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }

  // Insert relationship if from_person_id is provided
  // Insert relationship if from_person_id is provided
  if (data.from_person_id && data.relation_type) {
    // ── Canonical storage convention ──────────────────────────────────────
    // The BFS in treeLayout.ts relies on:
    //   type='parent' → from=parent, to=child  (generation goes DOWN)
    //   type='child'  → from=child,  to=parent (generation goes UP)
    //   type='spouse' → both directions stored
    //
    // The UI sends from_person_id=clicked-node, relation_type=what user chose.
    // We normalize so canonical direction is always respected.

    const fromId = data.from_person_id
    const newId  = person.id
    const relEn  = data.relation_en || data.relation_type

    const base = {
      tree_id: data.tree_id,
      relation_native: data.relation_native || null,
      relation_romanized: data.relation_romanized || null,
      language_code: data.language_code || null,
      marriage_status: data.marriage_status || null,
      married_date: data.married_date || null,
      child_type: data.child_type || null,
      sibling_type: data.sibling_type || null,
      added_by: user.id,
    }

    const relsToInsert: object[] = []

    if (data.relation_type === 'child') {
      // User clicked "+ Child" on fromId → newPerson IS a child OF fromId
      // Canonical: from=parent(fromId) → to=child(newId), type='parent'
      relsToInsert.push({ ...base, from_person_id: fromId, to_person_id: newId, relation_type: 'parent', relation_en: relEn })
      relsToInsert.push({ ...base, from_person_id: newId, to_person_id: fromId, relation_type: 'child',  relation_en: relEn })
    } else if (data.relation_type === 'parent') {
      // User clicked "+ Parent" on fromId → newPerson IS a parent OF fromId
      // Canonical: from=parent(newId) → to=child(fromId), type='parent'
      relsToInsert.push({ ...base, from_person_id: newId,  to_person_id: fromId, relation_type: 'parent', relation_en: relEn })
      relsToInsert.push({ ...base, from_person_id: fromId, to_person_id: newId,  relation_type: 'child',  relation_en: relEn })
    } else if (data.relation_type === 'spouse') {
      relsToInsert.push({ ...base, from_person_id: fromId, to_person_id: newId,  relation_type: 'spouse', relation_en: relEn })
      relsToInsert.push({ ...base, from_person_id: newId,  to_person_id: fromId, relation_type: 'spouse', relation_en: relEn })
    } else {
      // Other types (sibling, grandparent, etc.) — store both directions
      relsToInsert.push({ ...base, from_person_id: fromId, to_person_id: newId,  relation_type: data.relation_type, relation_en: relEn })
      relsToInsert.push({ ...base, from_person_id: newId,  to_person_id: fromId, relation_type: data.relation_type, relation_en: relEn })
    }

    const { error: relError } = await supabase.from('relationships').insert(relsToInsert)
    if (relError) {
      console.error('[members] Insert relationship error:', relError)
      // Don't fail the whole request — person was created
    }
  }

  // Send invitation if requested
  if (data.send_invite && data.invite_email) {
    await supabase.from('invitations').insert({
      tree_id: data.tree_id,
      email: data.invite_email,
      role: 'viewer',
      person_id: person.id,
      invited_by: user.id,
    })
  }

  // Trigger notifications asynchronously (non-blocking)
  const recipientIds = await getTreeMemberIds(supabase, data.tree_id, user.id)
  if (recipientIds.length > 0) {
    sendNotification({
      type: 'member_added',
      tree_id: data.tree_id,
      actor_id: user.id,
      person_id: person.id,
      recipient_ids: recipientIds,
      metadata: {
        person_name: person.full_name,
        relation_en: data.relation_en,
      },
    }).catch(console.error)
  }

  // Fetch the newly created relationships to return to client
  const [relsFrom, relsTo] = await Promise.all([
    supabase
      .from('relationships')
      .select('*')
      .eq('tree_id', data.tree_id)
      .eq('from_person_id', person.id),
    supabase
      .from('relationships')
      .select('*')
      .eq('tree_id', data.tree_id)
      .eq('to_person_id', person.id),
  ])
  
  const createdRels = [
    ...(relsFrom.data || []),
    ...(relsTo.data || []),
  ]

  return NextResponse.json(
    { data: { person, relationships: createdRels } },
    { status: 201 }
  )
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const treeId = req.nextUrl.searchParams.get('tree_id')
  const query  = req.nextUrl.searchParams.get('q')

  if (!treeId) return NextResponse.json({ error: 'tree_id required' }, { status: 400 })

  let dbQuery = supabase
    .from('persons')
    .select('*, relationships!relationships_from_person_id_fkey(*)')
    .eq('tree_id', treeId)
    .order('full_name')

  if (query) {
    dbQuery = dbQuery.ilike('full_name', `%${query}%`)
  }

  const { data, error } = await dbQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
