import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Box, Group, Paper } from "@mantine/core";
import { useMemo } from "react";
import Markdown from "react-markdown";
import { useParams } from "react-router";

import AppLinkAction from "./AppLinkAction";
import { sortLabels } from "./Label";
import { LabelChip } from "./LabelChip";
import classes from "./NoteView.module.css";
import UnknownNote from "./UnknownNote";
import { useNote } from "./gql";
import FavoriteIcon from "./FavoriteIcon";

export default function NoteView() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  const labels = useMemo(() => sortLabels(note?.labels ?? []), [note?.labels]);

  if (!note) return <UnknownNote />;

  const cls = [classes.markdown];
  if (note.favorite) cls.push(classes.hasFavorite);

  return (
    <>
      <Paper shadow="xs" p="md" className={classes.noteView}>
        <Box className={classes.noteContainer}>
          {note.favorite && (
            <Box
              title="Favorite note"
              area-label="Favorite note"
              className={classes.favoriteIcon}
            >
              <FavoriteIcon starred />
            </Box>
          )}
          <Box className={cls.join(" ")}>
            <Markdown>{`# ${note.title}`}</Markdown>
            {labels.length > 0 && (
              <Group gap="xs" className={classes.labels}>
                {labels.map((label) => (
                  <LabelChip label={label} link key={label.uuid} />
                ))}
              </Group>
            )}
            <Markdown>{note.text}</Markdown>
          </Box>
        </Box>
      </Paper>
      <AppLinkAction to={`/notes/${uuid}/editor`} replace icon={faEdit} />
    </>
  );
}
