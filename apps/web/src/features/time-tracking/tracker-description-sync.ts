/**
 * While the user is editing the tracker description, server/live snapshots of
 * the same timer must not overwrite the local draft (stale debounce echoes).
 * A different timer id always wins so start/stop/restart still hydrate.
 */
export function shouldSkipActiveTimerDescriptionSync(options: {
  sameTimer: boolean;
  skipDescription?: boolean;
  descriptionDirty: boolean;
}): boolean {
  if (!options.sameTimer) {
    return false;
  }

  return Boolean(options.skipDescription) || options.descriptionDirty;
}

/** Optimistic cache mirroring can make draft === cache before the server acks. */
export function shouldPersistActiveTimerDescription(options: {
  draftDescription: string;
  activeTimerDescription: string;
  descriptionDirty: boolean;
}): boolean {
  if (options.draftDescription !== options.activeTimerDescription) {
    return true;
  }

  return options.descriptionDirty;
}
