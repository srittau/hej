import AddNote from "./AddNote";

export default function NoNote() {
  return (
    <div className="no-note">
      Please choose a note from the sidebar or{" "}
      <AddNote>create a new note</AddNote>.
    </div>
  );
}
