import { ScrollArea, Stack, Text } from "@mantine/core";

import AddNote from "./AddNote";
import Logout from "./Logout";
import NotesLinks from "./NotesLinks";

interface NavBarProps {
  onClose?: () => void;
}

export default function NavBar({ onClose }: NavBarProps) {
  return (
    <Stack p="md" style={{ overflowY: "hidden" }}>
      <AddNote onClick={onClose}>Add note</AddNote>
      <ScrollArea type="auto">
        <Text size="xs" c="dimmed">
          Latest notes
        </Text>
        <NotesLinks onNoteClick={() => onClose?.()} />
        <Logout />
      </ScrollArea>
    </Stack>
  );
}
