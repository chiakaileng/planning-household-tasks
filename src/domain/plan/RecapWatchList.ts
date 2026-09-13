/**
 * Who appears on the recap strip. Only existing household members can stay selected.
 */
export class RecapWatchList {
  keepExisting(selected: readonly string[], memberIds: readonly string[]): string[] {
    const allowed = new Set(memberIds);
    return selected.filter((id) => allowed.has(id));
  }

  add(selected: readonly string[], memberId: string): string[] {
    if (!memberId || selected.includes(memberId)) {
      return [...selected];
    }
    return [...selected, memberId];
  }

  remove(selected: readonly string[], memberId: string): string[] {
    return selected.filter((id) => id !== memberId);
  }
}
