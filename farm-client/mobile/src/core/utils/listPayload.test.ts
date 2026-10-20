import { unwrapList, totalOf } from './listPayload';

/**
 * The API's list endpoints do NOT agree on their shape — this is the exact
 * mismatch that blanked the dashboard ("Couldn't load your dashboard") and
 * silently emptied several other screens. Each case below is a REAL payload
 * taken from the server code, not a hypothetical.
 */
describe('unwrapList', () => {
  it('passes a bare array through unchanged (workers, plans, notifications)', () => {
    const rows = [{ id: '1' }, { id: '2' }];
    expect(unwrapList(rows)).toBe(rows);
  });

  it('reads `{ data, total }` (livestock, poultry, aquaculture, finance, inventory)', () => {
    const rows = [{ id: 'l1', quantity: 12 }];
    expect(unwrapList({ data: rows, total: 1 })).toEqual(rows);
  });

  it('reads `{ farms, total, data }` (farms)', () => {
    const rows = [{ id: 'f1', status: 'active' }];
    expect(unwrapList({ farms: rows, total: 1, data: rows })).toEqual(rows);
  });

  it('reads `{ crops, total, data }` (crops)', () => {
    const rows = [{ id: 'c1' }];
    expect(unwrapList({ crops: rows, total: 1, data: rows })).toEqual(rows);
  });

  it('reads `{ data, stats }` (tasks)', () => {
    const rows = [{ id: 't1', title: 'Feed' }];
    expect(unwrapList({ data: rows, stats: {} })).toEqual(rows);
  });

  it('recurses one extra level for `{ data: { reports } }` (reports)', () => {
    const rows = [{ id: 'r1', title: 'Weekly' }];
    expect(unwrapList({ data: { reports: rows, total: 1, page: 1 } })).toEqual(rows);
  });

  it('falls back to `items` / `records` when present', () => {
    expect(unwrapList({ items: [{ id: 'i1' }] })).toEqual([{ id: 'i1' }]);
    expect(unwrapList({ records: [{ id: 'r1' }] })).toEqual([{ id: 'r1' }]);
  });

  it('returns [] for null / undefined / scalars instead of throwing', () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
    expect(unwrapList('nope')).toEqual([]);
    expect(unwrapList(42)).toEqual([]);
  });

  it('returns [] for an object with no known list key (never throws)', () => {
    expect(unwrapList({ total: 5, page: 1 })).toEqual([]);
  });

  // THE regression: a screen doing `res.data || []` then `.filter` threw a
  // TypeError on object payloads, which the screen's catch rendered as a
  // full-screen load failure despite the request succeeding.
  it('can be .filter-ed / .reduce-d directly on every real payload shape', () => {
    const shapes: any[] = [
      [{ id: 1 }],
      { data: [{ id: 1 }], total: 1 },
      { farms: [{ id: 1 }], total: 1, data: [{ id: 1 }] },
      { data: { reports: [{ id: 1 }] } },
    ];
    for (const shape of shapes) {
      expect(() => unwrapList(shape).filter(Boolean)).not.toThrow();
      expect(unwrapList(shape)).toHaveLength(1);
    }
  });
});

describe('totalOf', () => {
  const fulfilled = (body: any) => ({ status: 'fulfilled', value: { data: body } }) as any;

  it('prefers the server total nested at value.data.total', () => {
    // The axios response holds the body at `.data`, so `total` is NOT on
    // `value` directly — reading it there silently under-counted.
    expect(totalOf(fulfilled({ data: [], total: 99 }), [])).toBe(99);
  });

  it('falls back to the loaded rows when no total is present', () => {
    expect(totalOf(fulfilled([{ id: 1 }, { id: 2 }]), [{ id: 1 }, { id: 2 }])).toBe(2);
  });

  it('ignores a non-numeric total', () => {
    expect(totalOf(fulfilled({ total: 'lots' }), [{ id: 1 }])).toBe(1);
  });

  it('falls back to the rows for a rejected or missing result', () => {
    expect(totalOf({ status: 'rejected', reason: 'x' } as any, [{ id: 1 }])).toBe(1);
    expect(totalOf(null, [{ id: 1 }])).toBe(1);
  });
});
