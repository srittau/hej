import AddNote from "./AddNote";
import { Note } from "./Note";

interface NoNoteProps {
  onNoteAdded?: (note: Note) => void;
}

export default function NoNote({ onNoteAdded }: NoNoteProps) {
  return (
    <div className="no-note">
      Please choose a note from the sidebar or{" "}
      <AddNote onNoteAdded={onNoteAdded}>create a new note</AddNote>.
    </div>
  );
}
