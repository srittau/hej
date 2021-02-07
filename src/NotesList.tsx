import { Note } from "./Note";
import NoteItem from "./NoteItem";

interface NotesListProps {
  notes: readonly Note[];
  onClickNote?: (uuid: string) => void;
}

function NotesList({ notes, onClickNote }: NotesListProps) {
  return (
    <div className="notes-list">
      <ul>
        {notes.map((n) => (
          <NoteItem note={n} onClick={onClickNote} key={n.uuid} />
        ))}
      </ul>
    </div>
  );
}

export default NotesList;
