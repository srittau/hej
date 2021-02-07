import { Note, noteTitle } from "./Note";

interface NoteItemProps {
  note: Note;
  onClick?: (uuid: string) => void;
}

function NoteItem({ note, onClick }: NoteItemProps) {
  return (
    <li>
      <button onClick={() => onClick?.(note.uuid)}>{noteTitle(note)}</button>
    </li>
  );
}

export default NoteItem;
