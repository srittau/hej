import { faNoteSticky } from "@fortawesome/free-regular-svg-icons";

import EmptyState from "./EmptyState";
import NoteList from "./NoteList";
import { useNotesMeta } from "./gql";

export default function NoteListView() {
  const notes = useNotesMeta();
  if (notes.length === 0) {
    return (
      <EmptyState icon={faNoteSticky} message="No notes yet">
        Use “Add note” to create your first note.
      </EmptyState>
    );
  }
  return <NoteList notes={notes} />;
}
