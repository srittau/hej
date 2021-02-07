import { useState } from "react";

import "./App.css";

import AddNote from "./AddNote";
import NotesList from "./NotesList";
import { createNote, Note } from "./Note";
import NoteContainer from "./NoteContainer";
import { deleteNote, loadAllNotes, saveNote } from "./store";

function App() {
  const [notes, addNote, updateNote, deleteNote] = useNoteList();
  const [note, setActiveNote] = useActiveNote(notes);

  const onAddNote = () => {
    const newUUID = addNote();
    setActiveNote(newUUID);
  };

  const onDeleteNote = (uuid: string) => {
    setActiveNote(undefined);
    deleteNote(uuid);
  };

  return (
    <div className="app">
      <NotesList notes={notes} onClickNote={setActiveNote} />
      <NoteContainer
        note={note}
        onAddNote={onAddNote}
        onChangeNote={updateNote}
        onDeleteNote={onDeleteNote}
      />
      <AddNote onClick={onAddNote} />
    </div>
  );
}

export default App;

function useNoteList(): [
  noteList: readonly Note[],
  addNote: () => string,
  updateNote: (newNote: Note) => void,
  deleteNote: (uuid: string) => void,
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

  const deleteNoteFromList = (uuid: string) => {
    setList((oldList) => oldList.filter((n) => n.uuid !== uuid));
    deleteNote(uuid);
  };

  return [list, addNote, updateNote, deleteNoteFromList];
}

function useActiveNote(
  notes: readonly Note[],
): [Note | undefined, (uuid: string | undefined) => void] {
  const [activeUUID, setActiveUUID] = useState<string>();
  const note =
    activeUUID !== undefined
      ? notes.find((n) => n.uuid === activeUUID)
      : undefined;
  return [note, setActiveUUID];
}
