import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Box, Group, Paper } from "@mantine/core";
import { useMemo } from "react";
import Markdown from "react-markdown";
import { useParams } from "react-router";

import AppLinkAction from "./AppLinkAction";
import { LabelChip } from "./LabelChip";
import classes from "./NoteView.module.css";
import { useNote } from "./gql";
import FavoriteIcon from "./FavoriteIcon";

export default function NoteView() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  const [titleMd, textMd] = useNoteMarkdown(uuid);
  const labels = useMemo(
    () =>
      [...(note?.labels ?? [])].sort((l1, l2) =>
        l1.name.localeCompare(l2.name),
      ),
    [note?.labels],
  );

  const cls = [classes.markdown];
  if (note?.favorite) cls.push(classes.hasFavorite);

  return (
    <>
      {note && (
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
              <Markdown>{titleMd}</Markdown>
              {labels.length > 0 && (
                <Group gap="xs" className={classes.labels}>
                  {labels.map((label) => (
                    <LabelChip label={label} link key={label.uuid} />
                  ))}
                </Group>
              )}
              <Markdown>{textMd}</Markdown>
            </Box>
          </Box>
        </Paper>
      )}
      <AppLinkAction to={`/notes/${uuid}/editor`} replace icon={faEdit} />
    </>
  );
}

function useNoteMarkdown(uuid?: string): [title: string, text: string] {
  const note = useNote(uuid ?? "");
  if (!note) return ["# Unknown note selected", ""];
  let header = "# ";
  //   if (note.favorite) {
  //     header += `![Favorite note](/favorite.svg) `;
  //   }
  header += note.title;
  return [header, note.text];
}
