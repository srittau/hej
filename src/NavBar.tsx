import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, ScrollArea, Stack, Text } from "@mantine/core";
import { Link } from "react-router";

import AddNote from "./AddNote";
import classes from "./NavBar.module.css";
import NotesLinks from "./NotesLinks";
import { useFavoriteNotes, useLatestNotes } from "./gql";

interface NavBarProps {
  onClose?: () => void;
}

export default function NavBar({ onClose }: NavBarProps) {
  const notes = useLatestNotes(3);
  return (
    <Stack p="md" style={{ overflowY: "hidden" }}>
      <AddNote onClick={onClose}>Add note</AddNote>
      <ScrollArea type="auto">
        <Stack>
          <Favorites onClose={onClose} />
          <Box>
            <Text size="xs" c="dimmed">
              Latest notes
            </Text>
            <NotesLinks notes={notes} onNoteClick={() => onClose?.()} />
          </Box>
          <Link to="/notes" onClick={() => onClose?.()}>
            <Button variant="subtle">All notes</Button>
          </Link>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

interface FavoritesProps {
  onClose?: () => void;
}

function Favorites({ onClose }: FavoritesProps) {
  const notes = useFavoriteNotes();
  if (notes.length === 0) return null;
  return (
    <Box>
      <Text size="xs" c="dimmed">
        <FontAwesomeIcon icon={faStar} className={classes.favoriteIcon} />{" "}
        Favorites
      </Text>
      <NotesLinks notes={notes} onNoteClick={() => onClose?.()} />
    </Box>
  );
}
