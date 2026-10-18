export interface Label {
  uuid: string;
  name: string;
  slug: string;
  color: string; // #rrggbb
  favorite: boolean;
}

/** Return the labels sorted by name. */
export function sortLabels<L extends Pick<Label, "name">>(
  labels: readonly L[],
): L[] {
  return [...labels].sort((l1, l2) => l1.name.localeCompare(l2.name));
}
