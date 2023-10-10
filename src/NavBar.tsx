import { Stack } from "@mantine/core";

import AddNote from "./AddNote";
import Logout from "./Logout";
import NotesList from "./NotesList";

export default function NavBar() {
  return (
    <Stack p="md">
      <AddNote>Add note</AddNote>
      <NotesList />
      <Logout />
    </Stack>
  );
}
