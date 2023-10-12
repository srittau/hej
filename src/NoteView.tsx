import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Paper } from "@mantine/core";
import Markdown from "react-markdown";
import { useParams } from "react-router-dom";

import AppLinkAction from "./AppLinkAction";
import { useNote } from "./gql";

export default function NoteView() {
  const { uuid } = useParams<string>();
  const note = useNote(uuid ?? "");
  return (
    <>
      {note && (
        <Paper shadow="xs" p="md">
          <Markdown>{`# ${note.title}\n\n${note.text}`}</Markdown>
        </Paper>
      )}
      <AppLinkAction to={`/notes/${uuid}/editor`} replace icon={faEdit} />
    </>
  );
}
