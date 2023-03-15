import { useNotes } from "./gql";
import NoteItem from "./NoteItem";

interface NotesListProps {
  onClickNote?: (uuid: string) => void;
}

export default function NotesList({ onClickNote }: NotesListProps) {
  const notes = useNotes();
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
