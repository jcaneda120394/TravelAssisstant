describe('place photo search naming', () => {
  it('strips bilingual parentheses for search', () => {
    const raw = 'チームラボプラネッツ (teamLab Planets)';
    const paren = raw.match(/\(([^)]+)\)\s*$/);
    const english = paren?.[1] && /[A-Za-z]/.test(paren[1]) ? paren[1].trim() : raw;
    expect(english).toBe('teamLab Planets');
  });
});
