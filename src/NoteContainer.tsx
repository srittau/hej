import NoNote from "./NoNote";
import { Note } from "./Note";
import NoteView from "./NoteView";

interface NoteContainerProps {
  note?: Note;
  onAddNote?: () => void;
  onChangeNote?: (newNote: Note) => void;
  onDeleteNote?: (uuid: string) => void;
}

function NoteContainer({
  note,
  onAddNote,
  onChangeNote,
  onDeleteNote,
}: NoteContainerProps) {
  return (
    <div className="note-container">
      {note ? (
        <NoteView
          note={note}
          onChangeNote={onChangeNote}
          onDeleteNote={onDeleteNote}
        />
      ) : (
        <NoNote onAddClick={onAddNote} />
      )}
    </div>
  );
}

export default NoteContainer;
