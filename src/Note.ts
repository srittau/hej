import { v4 as uuidv4 } from "uuid";

export interface Note {
  uuid: string;
  title: string;
  text: string;
}

export function createNote(): Note {
  const uuid = uuidv4();
  return { uuid, title: "", text: "" };
}

export function noteTitle(note: Note): string {
  return note.title.trim() || "<untitled>";
}
