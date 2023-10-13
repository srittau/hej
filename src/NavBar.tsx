import { Button, ScrollArea, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import AddNote from "./AddNote";
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
        <Link to="/notes" onClick={() => onClose?.()}>
          <Button variant="subtle">All notes</Button>
        </Link>
      </ScrollArea>
    </Stack>
  );
}
