import { useEffect, useState } from "react";

import "./AppPage.css";

import AddNote from "./AddNote";
import NotesList from "./NotesList";
import { Note } from "./Note";
import NoteContainer from "./NoteContainer";
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "./gql";
import Logout from "./Logout";

export default function AppPage() {
  const notes = useNotes();
  const [createNote, newNoteUUID] = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [note, setActiveUUID] = useActiveNote(notes, newNoteUUID);

  const onDeleteNote = (uuid: string) => {
    setActiveUUID(undefined);
    deleteNote(uuid);
  };

  return (
    <div className="app-page">
      <NotesList notes={notes} onClickNote={setActiveUUID} />
      <NoteContainer
        note={note}
        onAddNote={() => createNote()}
        onChangeNote={updateNote}
        onDeleteNote={onDeleteNote}
      />
      <AddNote onClick={() => createNote()} />
      <Logout />
    </div>
  );
}

function useActiveNote(
  notes: readonly Note[],
  activeNoteUUID?: string,
): [Note | undefined, (uuid: string | undefined) => void] {
  const [activeUUID, setActiveUUID] = useState<string>();

  useEffect(() => {
    if (activeNoteUUID !== undefined) {
      setActiveUUID(activeNoteUUID);
    }
  }, [activeNoteUUID]);

  const note =
    activeUUID !== undefined
      ? notes.find((n) => n.uuid === activeUUID)
      : undefined;
  return [note, setActiveUUID];
}
