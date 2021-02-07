import { Note } from "./Note";

export function loadAllNotes(): Note[] {
  let fetchedList = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    const item = localStorage.getItem(key);
    if (item === null) continue;
    fetchedList.push(JSON.parse(item) as Note);
  }
  return fetchedList;
}

export function saveNote(note: Note): void {
  localStorage.setItem(note.uuid, JSON.stringify(note));
}

export function deleteNote(uuid: string): void {
  localStorage.removeItem(uuid);
}
