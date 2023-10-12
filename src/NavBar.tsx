import { Stack } from "@mantine/core";

import AddNote from "./AddNote";
import Logout from "./Logout";
import NotesLinks from "./NotesLinks";

interface NavBarProps {
  onClose?: () => void;
}

export default function NavBar({ onClose }: NavBarProps) {
  return (
    <Stack p="md">
      <AddNote onClick={onClose}>Add note</AddNote>
      <NotesLinks onNoteClick={() => onClose?.()} />
      <Logout />
    </Stack>
  );
}
