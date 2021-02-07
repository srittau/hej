import { useState } from "react";

import "./App.css";

import AddNote from "./AddNote";
import NotesList from "./NotesList";
import { createNote, Note } from "./Note";
import NoteContainer from "./NoteContainer";
import { loadAllNotes, saveNote } from "./store";

function App() {
  const [notes, addNote, updateNote] = useNoteList();
  const [note, changeNote] = useActiveNote(notes);

  const onAddNote = () => {
    const newUUID = addNote();
    changeNote(newUUID);
  };

  return (
    <div className="app">
      <NotesList notes={notes} onClickNote={changeNote} />
      <NoteContainer
        note={note}
        onNoteChanged={updateNote}
        onAddNote={onAddNote}
      />
      <AddNote onClick={onAddNote} />
    </div>
  );
}

export default App;

function useNoteList(): [
  readonly Note[],
  () => string,
  (newNote: Note) => void,
] {
  const [list, setList] = useState<Note[]>(() => loadAllNotes());

  const addNote = (): string => {
    const newNote = createNote();
    setList((oldList) => [newNote, ...oldList]);
    saveNote(newNote);
    return newNote.uuid;
  };

  const updateNote = (changedNote: Note) => {
    setList((oldList) => [
      changedNote,
      ...oldList.filter((n) => n.uuid !== changedNote.uuid),
    ]);
    saveNote(changedNote);
  };

  return [list, addNote, updateNote];
}

function useActiveNote(
  notes: readonly Note[],
): [Note | undefined, (uuid: string) => void] {
  const [activeUUID, setActiveUUID] = useState<string>();
  const note =
    activeUUID !== undefined
      ? notes.find((n) => n.uuid === activeUUID)
      : undefined;
  return [note, setActiveUUID];
}
