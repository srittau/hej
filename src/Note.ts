export interface NoteMeta {
  uuid: string;
  title: string;
  favorite: boolean;
  creationDate: string;
  lastChanged: string;
}

export interface Note extends NoteMeta {
  text: string;
  favorite: boolean;
}

export function noteTitle(note: NoteMeta): string {
  return note.title.trim() || "<untitled>";
}
