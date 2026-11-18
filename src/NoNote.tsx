import { Text } from "@mantine/core";

import AddNote from "./AddNote.tsx";

export default function NoNote() {
  return (
    <Text>
      Please choose a note from the sidebar or{" "}
      <AddNote>create a new note</AddNote>.
    </Text>
  );
}
