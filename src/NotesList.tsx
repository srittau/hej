import { Link } from "react-router-dom";

import { noteTitle } from "./Note";
import { useNotes } from "./gql";

export default function NotesList() {
  const notes = useNotes();
  return (
    <div className="notes-list">
      <ul>
        {notes.map((note) => (
          <li key={note.uuid}>
            <Link to={`/notes/${note.uuid}`}>{noteTitle(note)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
