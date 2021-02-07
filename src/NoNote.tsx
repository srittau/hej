interface NoNoteProps {
  onAddClick?: () => void;
}

function NoNote({ onAddClick }: NoNoteProps) {
  return (
    <div className="no-note">
      Please choose a note from the sidebar or{" "}
      <button onClick={() => onAddClick?.()}>create a new note</button>.
    </div>
  );
}

export default NoNote;
