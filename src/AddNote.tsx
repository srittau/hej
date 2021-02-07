interface AddNoteProps {
  onClick?: () => void;
}

function AddNote({ onClick }: AddNoteProps) {
  return (
    <button className="add-note" onClick={() => onClick?.()}>
      Add Note
    </button>
  );
}

export default AddNote;
