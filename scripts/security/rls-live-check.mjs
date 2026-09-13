#!/usr/bin/env node
/**
 * Live RLS + invite security checks against the linked Supabase project.
 *
 * Usage (do NOT commit service role keys):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/security/rls-live-check.mjs
 *
 * Optional:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://viyzvgdvnxhddtobpyys.supabase.co';
const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!ANON_KEY || !SERVICE_KEY) {
  console.error(
    'Missing keys. Set EXPO_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function userClient(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createTestUser(label) {
  const email = `rls.${label}.${Date.now()}.${randomBytes(3).toString('hex')}@example.com`;
  const password = `Test-${randomBytes(9).toString('base64url')}!aA1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}` },
  });
  if (error || !data.user) {
    throw new Error(`createUser ${label}: ${error?.message}`);
  }
  // Ensure profile row exists (trigger usually creates it).
  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: `RLS ${label}`,
    onboarding_completed: true,
    role: 'user',
    is_disabled: false,
  });

  // Always mint a user JWT via the anon client — never sign in on the service-role client.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) {
    throw new Error(`signIn ${label}: ${signed.error?.message}`);
  }
  return {
    id: data.user.id,
    email,
    password,
    accessToken: signed.data.session.access_token,
  };
}

async function cleanupUser(userId) {
  await admin.from('trips').delete().eq('owner_id', userId);
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

async function main() {
  const results = [];
  let userA;
  let userB;
  let tripId;

  try {
    userA = await createTestUser('a');
    userB = await createTestUser('b');
    const clientA = userClient(userA.accessToken);
    const clientB = userClient(userB.accessToken);

    // A creates a private trip
    const { data: trip, error: tripError } = await clientA
      .from('trips')
      .insert({
        owner_id: userA.id,
        title: 'RLS Private Trip',
        start_date: '2030-01-01',
        end_date: '2030-01-05',
        destinations: ['Test City'],
        adults: 1,
        children: 0,
        is_public: false,
      })
      .select('id, owner_id, title')
      .single();
    assert(!tripError && trip, `A create trip failed: ${tripError?.message}`);
    tripId = trip.id;
    results.push({ id: 'RLS-01', ok: true, detail: 'Owner can create trip' });

    // B cannot read A's private trip
    const { data: leak, error: leakError } = await clientB
      .from('trips')
      .select('id, title')
      .eq('id', tripId)
      .maybeSingle();
    assert(!leak, `B should not read A's trip (got ${JSON.stringify(leak)} / ${leakError?.message})`);
    results.push({ id: 'RLS-02', ok: true, detail: 'Cross-user trip read denied' });

    // B cannot update A's trip
    const { data: updated, error: updateError } = await clientB
      .from('trips')
      .update({ title: 'Hacked' })
      .eq('id', tripId)
      .select('id')
      .maybeSingle();
    assert(!updated, `B update should fail (err=${updateError?.message})`);
    results.push({ id: 'RLS-03', ok: true, detail: 'Cross-user trip update denied' });

    // B cannot delete A's trip
    const { error: deleteError } = await clientB.from('trips').delete().eq('id', tripId);
    const { data: stillThere } = await admin.from('trips').select('id').eq('id', tripId).maybeSingle();
    assert(stillThere, `Trip missing after B delete attempt (${deleteError?.message})`);
    results.push({ id: 'RLS-04', ok: true, detail: 'Cross-user trip delete denied' });

    // Privilege escalation: B cannot set role=admin
    const { error: escalateError } = await clientB
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userB.id);
    const { data: roleRow } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userB.id)
      .single();
    assert(roleRow?.role === 'user', `Role escalation succeeded (${escalateError?.message})`);
    results.push({ id: 'RLS-05', ok: true, detail: 'Self role escalation blocked' });

    // Invite flow
    const { data: invite, error: inviteError } = await clientA
      .from('trip_members')
      .insert({
        trip_id: tripId,
        email: userB.email,
        role: 'viewer',
        status: 'pending',
      })
      .select('id, invite_token, expires_at, status')
      .single();
    assert(
      !inviteError && invite?.invite_token && invite.invite_token.length >= 32,
      `Invite token missing: ${inviteError?.message}`,
    );
    assert(invite.expires_at, 'Invite expires_at missing');
    results.push({ id: 'INV-01', ok: true, detail: 'Invite minted with secure token + expiry' });

    // Wrong email cannot accept (create user C)
    const userC = await createTestUser('c');
    const clientC = userClient(userC.accessToken);
    const { error: mismatchError } = await clientC.rpc('accept_trip_invite', {
      p_token: invite.invite_token,
    });
    assert(mismatchError, 'Wrong email should not accept invite');
    results.push({ id: 'INV-02', ok: true, detail: 'Invite email mismatch rejected' });

    // B accepts
    const { data: accepted, error: acceptError } = await clientB.rpc('accept_trip_invite', {
      p_token: invite.invite_token,
    });
    assert(!acceptError && accepted?.status === 'accepted', `Accept failed: ${acceptError?.message}`);
    results.push({ id: 'INV-03', ok: true, detail: 'Invitee can accept matching invite' });

    // Token single-use
    const { error: reuseError } = await clientB.rpc('accept_trip_invite', {
      p_token: invite.invite_token,
    });
    assert(reuseError, 'Invite token should be single-use after accept');
    results.push({ id: 'INV-04', ok: true, detail: 'Invite token invalidated after accept' });

    // B can now read trip
    const { data: shared } = await clientB
      .from('trips')
      .select('id, title')
      .eq('id', tripId)
      .maybeSingle();
    assert(shared?.id === tripId, 'Accepted member should read trip');
    results.push({ id: 'INV-05', ok: true, detail: 'Accepted member can read shared trip' });

    // Revoke
    const { error: revokeError } = await clientA.rpc('revoke_trip_invite', {
      p_member_id: invite.id,
    });
    assert(!revokeError, `Revoke failed: ${revokeError?.message}`);
    const { data: afterRevoke } = await clientB
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .maybeSingle();
    assert(!afterRevoke, 'Revoked member should lose trip read access');
    results.push({ id: 'INV-06', ok: true, detail: 'Revoked member loses access immediately' });

    // Anonymous cannot read private trip
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: anonLeak } = await anon.from('trips').select('id').eq('id', tripId).maybeSingle();
    assert(!anonLeak, 'Anonymous should not read private trip');
    results.push({ id: 'RLS-06', ok: true, detail: 'Anonymous private trip read denied' });

    // Session revoke on disable
    const { error: disableError } = await admin
      .from('profiles')
      .update({ is_disabled: true })
      .eq('id', userB.id);
    assert(!disableError, `Disable failed: ${disableError?.message}`);
    await admin.auth.admin.signOut(userB.id, 'global');
    const { data: writeAttempt, error: writeErr } = await clientB
      .from('saved_places')
      .insert({
        user_id: userB.id,
        place_json: { id: 'rls-test', name: 'Should fail' },
      })
      .select('id')
      .maybeSingle();
    // JWT may still be valid until ban; is_active_user should block writes.
    assert(!writeAttempt, `Disabled user write should fail (${writeErr?.message})`);
    results.push({ id: 'SES-01', ok: true, detail: 'Disabled user writes blocked by is_active_user' });

    await cleanupUser(userC.id);

    console.log('\nLive security checks passed:\n');
    for (const row of results) {
      console.log(`  ✓ ${row.id} — ${row.detail}`);
    }
    console.log(`\nTotal: ${results.length} checks`);
  } catch (error) {
    console.error('\nFAILED:', error instanceof Error ? error.message : error);
    console.error('Passed before failure:', results.map((r) => r.id).join(', ') || '(none)');
    process.exitCode = 1;
  } finally {
    if (userA?.id) await cleanupUser(userA.id);
    if (userB?.id) await cleanupUser(userB.id);
  }
}

main();
