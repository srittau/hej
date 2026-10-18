import { Label } from "./Label";

export interface NoteMeta {
  uuid: string;
  title: string;
  favorite: boolean;
  creationDate: string;
  lastChanged: string;
  labels: readonly Label[];
}

export interface Note extends NoteMeta {
  text: string;
}

export function noteTitle(note: NoteMeta): string {
  return note.title.trim() || "<untitled>";
}
