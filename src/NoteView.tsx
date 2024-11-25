import { faEdit, faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Paper } from "@mantine/core";
import Markdown from "react-markdown";
import { useParams } from "react-router";

import AppLinkAction from "./AppLinkAction";
import classes from "./NoteView.module.css";
import { useNote } from "./gql";

export default function NoteView() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  const md = useNoteMarkdown(uuid);

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
                <FontAwesomeIcon icon={faStar} />
              </Box>
            )}
            <Box className={cls.join(" ")}>
              <Markdown>{md}</Markdown>
            </Box>
          </Box>
        </Paper>
      )}
      <AppLinkAction to={`/notes/${uuid}/editor`} replace icon={faEdit} />
    </>
  );
}

function useNoteMarkdown(uuid?: string): string {
  const note = useNote(uuid ?? "");
  if (!note) return "# Unknown note selected";
  let header = "# ";
  //   if (note.favorite) {
  //     header += `![Favorite note](/favorite.svg) `;
  //   }
  header += note.title;
  return `${header}\n\n${note.text}`;
}
