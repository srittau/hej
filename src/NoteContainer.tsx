import NoNote from "./NoNote";
import { Note } from "./Note";
import NoteView from "./NoteView";

interface NoteContainerProps {
  note?: Note;
  onNoteChanged?: (newNote: Note) => void;
  onAddNote?: () => void;
}

function NoteContainer({ note, onNoteChanged, onAddNote }: NoteContainerProps) {
  return (
    <div className="note-container">
      {note ? (
        <NoteView note={note} onNoteChanged={onNoteChanged} />
      ) : (
        <NoNote onAddClick={onAddNote} />
      )}
    </div>
  );
}

export default NoteContainer;
