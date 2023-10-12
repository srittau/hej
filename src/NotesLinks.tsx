import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "@mantine/core";
import { Link, useParams } from "react-router-dom";

import { noteTitle } from "./Note";
import classes from "./NotesLinks.module.css";
import { useNotes } from "./gql";

interface NotesListProps {
  onNoteClick?: (uuid: string) => void;
}

export default function NotesLinks({ onNoteClick }: NotesListProps) {
  const notes = useNotes();
  const { uuid } = useParams<string>();
  console.log(uuid);
  return (
    <div className={classes.section}>
      {notes.map((note) => (
        <NavLink
          component={Link}
          label={noteTitle(note)}
          rightSection={
            note.uuid === uuid && <FontAwesomeIcon icon={faChevronRight} />
          }
          to={`/notes/${note.uuid}`}
          active={note.uuid === uuid}
          variant="subtle"
          className={classes.link}
          onClick={() => onNoteClick?.(note.uuid)}
          key={note.uuid}
        />
      ))}
    </div>
  );
}
