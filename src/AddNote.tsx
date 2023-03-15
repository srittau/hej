import { Note } from "./Note";
import { useCreateNote } from "./gql";

interface AddNoteProps {
  onNoteAdded?: (note: Note) => void;
  children?: React.ReactNode;
}

export default function AddNote({ onNoteAdded, children }: AddNoteProps) {
  const createNote = useCreateNote();

  async function onClick() {
    const note = await createNote();
    onNoteAdded?.(note);
  }

  return (
    <button className="add-note" onClick={() => void onClick()}>
      {children}
    </button>
  );
}
