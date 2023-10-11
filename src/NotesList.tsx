import { Link } from "react-router-dom";

import { noteTitle } from "./Note";
import { useNotes } from "./gql";

interface NotesListProps {
  onNoteClick?: (uuid: string) => void;
}

export default function NotesList({ onNoteClick }: NotesListProps) {
  const notes = useNotes();
  return (
    <div className="notes-list">
      <ul>
        {notes.map((note) => (
          <li key={note.uuid}>
            <Link
              to={`/notes/${note.uuid}`}
              onClick={() => onNoteClick?.(note.uuid)}
            >
              {noteTitle(note)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
