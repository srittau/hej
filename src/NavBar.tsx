import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Box, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { Link, useMatch } from "react-router";

import AddNote from "./AddNote";
import NotesLinks from "./NotesLinks";
import { useFavoriteNotes, useLatestNotes } from "./gql";
import FavoriteIcon from "./FavoriteIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface NavBarProps {
  onClose?: () => void;
}

export default function NavBar({ onClose }: NavBarProps) {
  const notes = useLatestNotes(3);
  const isNotesPage = useMatch("/notes") !== null;

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
          <Box>
            <Text size="xs" c="dimmed">
              Other
            </Text>
            <NavLink
              component={Link}
              label="All notes"
              rightSection={
                isNotesPage && <FontAwesomeIcon icon={faChevronRight} />
              }
              to="/notes"
              active={isNotesPage}
              variant="subtle"
            />
          </Box>
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
        <FavoriteIcon starred /> Favorites
      </Text>
      <NotesLinks notes={notes} onNoteClick={() => onClose?.()} />
    </Box>
  );
}
