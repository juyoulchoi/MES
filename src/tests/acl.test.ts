// ==============================
// tests/acl.test.ts (vitest)
// ==============================
import { describe, it, expect } from 'vitest';
import { filterMenuByRole, filterTreeByRole } from '@/lib/acl';

describe('filterMenuByRole', () => {
  it('allows when roles omitted', () => {
    const out = filterMenuByRole(
      [{ id: 'a', label: 'A', path: '/app/a' }],
      ['USER']
    );
    expect(out.length).toBe(1);
  });
  it('filters by roles', () => {
    const out = filterMenuByRole(
      [
        { id: 'a', label: 'A', path: '/app/a', roles: ['ADMIN'] },
        { id: 'b', label: 'B', path: '/app/b', roles: ['USER'] },
      ],
      ['USER']
    );
    expect(out.map((x) => x.id)).toEqual(['b']);
  });
  it('returns [] when items is undefined', () => {
    const out = filterMenuByRole(undefined, ['USER']);
    expect(out).toEqual([]);
  });
});

describe('filterTreeByRole', () => {
  it('keeps folders with visible children', () => {
    const out = filterTreeByRole(
      [
        {
          id: 'root',
          label: 'root',
          children: [
            { id: 'c1', label: 'c1', path: '/app/c1', roles: ['USER'] },
            { id: 'c2', label: 'c2', path: '/app/c2', roles: ['ADMIN'] },
          ],
        },
      ],
      ['USER']
    );
    expect(out.length).toBe(1);
    expect(out[0].children!.length).toBe(1);
    expect(out[0].children![0].id).toBe('c1');
  });
  it('returns [] when nodes is undefined', () => {
    const out = filterTreeByRole(undefined, ['USER']);
    expect(out).toEqual([]);
  });
});
