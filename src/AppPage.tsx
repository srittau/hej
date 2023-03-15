import { useState } from "react";

import "./AppPage.css";

import AddNote from "./AddNote";
import NotesList from "./NotesList";
import { Note } from "./Note";
import NoteContainer from "./NoteContainer";
import { useNotes } from "./gql";
import Logout from "./Logout";

export default function AppPage() {
  const [note, setActiveUUID] = useActiveNote();

  return (
    <div className="app-page">
      <NotesList onClickNote={setActiveUUID} />
      <NoteContainer
        note={note}
        onNoteAdded={(note) => setActiveUUID(note.uuid)}
        onDeleteNote={() => setActiveUUID(undefined)}
      />
      <AddNote onNoteAdded={(note) => setActiveUUID(note.uuid)}>
        Add note
      </AddNote>
      <Logout />
    </div>
  );
}

function useActiveNote(): [
  Note | undefined,
  (uuid: string | undefined) => void,
] {
  const notes = useNotes();
  const [activeUUID, setActiveUUID] = useState<string>();

  const note =
    activeUUID !== undefined
      ? notes.find((n) => n.uuid === activeUUID)
      : undefined;
  return [note, setActiveUUID];
}
