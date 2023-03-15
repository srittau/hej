import NoNote from "./NoNote";
import { Note } from "./Note";
import NoteView from "./NoteView";

interface NoteContainerProps {
  note?: Note;
  onNoteAdded?: (note: Note) => void;
  onDeleteNote?: (uuid: string) => void;
}

export default function NoteContainer({
  note,
  onNoteAdded,
  onDeleteNote,
}: NoteContainerProps) {
  return (
    <div className="note-container">
      {note ? (
        <NoteView note={note} onDeleteNote={onDeleteNote} />
      ) : (
        <NoNote onNoteAdded={onNoteAdded} />
      )}
    </div>
  );
}
