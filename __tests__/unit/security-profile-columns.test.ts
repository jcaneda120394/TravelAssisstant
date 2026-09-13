/** Documents the safe profile column contract used after admin_notes revoke. */
describe('profile safe columns contract', () => {
  const PROFILE_SAFE_COLUMNS =
    'id, email, full_name, avatar_url, phone, bio, onboarding_completed, role, is_disabled, created_at, updated_at';

  it('does not request admin_notes', () => {
    expect(PROFILE_SAFE_COLUMNS.includes('admin_notes')).toBe(false);
  });

  it('still includes role and is_disabled for client gates', () => {
    expect(PROFILE_SAFE_COLUMNS).toContain('role');
    expect(PROFILE_SAFE_COLUMNS).toContain('is_disabled');
  });
});
