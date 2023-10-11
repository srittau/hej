import { Stack } from "@mantine/core";

import AddNote from "./AddNote";
import Logout from "./Logout";
import NotesList from "./NotesList";

interface NavBarProps {
  onClose?: () => void;
}

export default function NavBar({ onClose }: NavBarProps) {
  return (
    <Stack p="md">
      <AddNote onClick={onClose}>Add note</AddNote>
      <NotesList onNoteClick={() => onClose?.()} />
      <Logout />
    </Stack>
  );
}
