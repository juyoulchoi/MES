// ==============================
// tests/nav.sanitize.test.ts (vitest)
// ==============================
import { describe, it, expect } from 'vitest';
import {
  sanitizeMenu,
  sanitizeTree,
  sanitizeNavPayload,
  toSafeTree,
} from '@/lib/guards';

describe('sanitizeMenu', () => {
  it('returns [] for non-array', () => {
    expect(sanitizeMenu(null)).toEqual([]);
    expect(sanitizeMenu({})).toEqual([]);
  });
  it('filters out invalid items and coerces labels', () => {
    const out = sanitizeMenu([
      { id: 1, label: { k: 'obj' }, path: '/app/a' },
      { id: 'b', label: 'B', path: 'relative/b' }, // filtered(절대 아님)
      { id: 'c', path: '/app/c' }, // label 없음 → id 사용
    ]);
    expect(out.length).toBe(2);
    expect(out[0]).toEqual({
      id: '1',
      label: '[object Object]',
      path: '/app/a',
      roles: undefined,
    });
    expect(out[1]).toEqual({
      id: 'c',
      label: 'c',
      path: '/app/c',
      roles: undefined,
    });
  });
  it('drops function labels (bound dispatchSetState 등) and uses id fallback', () => {
    const out = sanitizeMenu([{ id: 'fn', label: () => {}, path: '/app/fn' }]);
    expect(out[0]).toEqual({
      id: 'fn',
      label: 'fn',
      path: '/app/fn',
      roles: undefined,
    });
  });
});
it('filters out invalid items and coerces labels', () => {
  const out = sanitizeMenu([
    { id: 1, label: { k: 'obj' }, path: '/app/a' },
    { id: 'b', label: 'B', path: 'relative/b' }, // filtered(절대 아님)
    { id: 'c', path: '/app/c' }, // label 없음 → id 사용
  ]);
  expect(out.length).toBe(2);
  expect(out[0]).toEqual({
    id: '1',
    label: '[object Object]',
    path: '/app/a',
    roles: undefined,
  });
  expect(out[1]).toEqual({
    id: 'c',
    label: 'c',
    path: '/app/c',
    roles: undefined,
  });
});

describe('sanitizeTree', () => {
  it('handles deep children and coerces non-string labels', () => {
    const out = sanitizeTree([
      {
        id: 1,
        label: { x: 1 },
        children: [
          { id: 2, label: ['arr'], path: '/app/p1' },
          { id: 3, label: null },
        ],
      },
    ]);
    expect(out[0].label).toBe('[object Object]');
    // children 라벨도 문자열화
    expect(out[0].children![0].label).toBe('arr');
  });
});

describe('sanitizeNavPayload', () => {
  it('normalizes arbitrary input', () => {
    const raw = { menu: { bad: true }, tree: { also: 'bad' } };
    const safe = sanitizeNavPayload(raw);
    expect(safe.menu).toEqual([]);
    expect(safe.tree).toEqual([]);
  });
});

describe('toSafeTree', () => {
  it('returns UINode[] with required shapes', () => {
    const ui = toSafeTree([
      { id: 'a', label: 'A' },
      {
        id: 'b',
        label: 'B',
        children: [{ id: 'c', label: 'C', path: '/app/c' }],
      },
    ]);
    expect(Array.isArray(ui)).toBe(true);
    expect(Array.isArray(ui[0].children)).toBe(true);
    expect(Array.isArray(ui[0].roles)).toBe(true);
    expect(typeof ui[0].defaultExpanded).toBe('boolean');
    expect(ui[1].children[0].path).toBe('/app/c');
  });
});
