export interface Note {
  uuid: string;
  title: string;
  text: string;
  lastChanged: string;
}

export function noteTitle(note: Note): string {
  return note.title.trim() || "<untitled>";
}
