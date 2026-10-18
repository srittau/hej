import NoteList from "./NoteList";
import { useNotesMeta } from "./gql";

export default function NoteListView() {
  const notes = useNotesMeta();
  return <NoteList notes={notes} />;
}
