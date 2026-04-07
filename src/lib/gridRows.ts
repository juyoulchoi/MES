export type CheckableRow = {
  CHECK?: boolean;
};

export function toggleCheckedRow<T extends CheckableRow>(rows: T[], rowIndex: number, checked: boolean) {
  const next = [...rows];
  next[rowIndex] = { ...next[rowIndex], CHECK: checked };
  return next;
}

export function patchCheckedRow<T extends CheckableRow>(
  rows: T[],
  rowIndex: number,
  patch: Partial<T>
) {
  const next = [...rows];
  next[rowIndex] = { ...next[rowIndex], ...patch, CHECK: true };
  return next;
}

export function removeCheckedRows<T extends CheckableRow>(rows: T[]) {
  return rows.filter((row) => !row.CHECK);
}
