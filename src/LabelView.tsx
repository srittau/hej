import {
  faCircleQuestion,
  faNoteSticky,
} from "@fortawesome/free-regular-svg-icons";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Anchor, Button, Group, Paper, Stack, Title } from "@mantine/core";
import { Link, useParams } from "react-router";

import EmptyState from "./EmptyState";
import FavoriteIcon from "./FavoriteIcon";
import { LabelChip } from "./LabelChip";
import classes from "./LabelView.module.css";
import NoteList from "./NoteList";
import { useLabel, useLabelNotes } from "./gql";

export default function LabelView() {
  const { slug } = useParams<string>();
  const label = useLabel(slug ?? "");
  const notes = useLabelNotes(slug ?? "");

  if (!label) {
    return (
      <EmptyState icon={faCircleQuestion} message="Unknown label">
        It may have been renamed or deleted.{" "}
        <Anchor component={Link} to="/labels" inherit>
          Show all labels
        </Anchor>
      </EmptyState>
    );
  }

  return (
    <Stack>
      <Paper shadow="xs" p="md">
        <Stack gap="xs" align="flex-start">
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Group gap="sm" wrap="nowrap">
              {label.favorite && (
                <span
                  title="Favorite label"
                  aria-label="Favorite label"
                  className={classes.favoriteIcon}
                >
                  <FavoriteIcon starred />
                </span>
              )}
              <Title order={1}>{label.name}</Title>
            </Group>
            <Button
              component={Link}
              to={`/labels/${label.slug}/editor`}
              replace
              variant="light"
              leftSection={<FontAwesomeIcon icon={faEdit} />}
            >
              Edit label
            </Button>
          </Group>
          <LabelChip label={label} />
        </Stack>
      </Paper>
      {notes.length > 0 ? (
        <NoteList notes={notes} />
      ) : (
        <EmptyState icon={faNoteSticky} message="No notes with this label">
          Add labels to notes in the note editor.
        </EmptyState>
      )}
    </Stack>
  );
}
