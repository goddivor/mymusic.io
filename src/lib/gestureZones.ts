let playerBarTop = Number.POSITIVE_INFINITY;

/** The player bar reports its window position so the drawer can ignore swipes that start on it. */
export function setPlayerBarTop(y: number): void {
  playerBarTop = y;
}

export function startsOnPlayerBar(y0: number): boolean {
  return y0 >= playerBarTop;
}
