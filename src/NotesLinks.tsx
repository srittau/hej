import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "@mantine/core";
import { Link, useParams } from "react-router";

import { NoteMeta, noteTitle } from "./Note";

interface NotesListProps {
  notes: readonly NoteMeta[];
  onNoteClick?: (uuid: string) => void;
}

export default function NotesLinks({ notes, onNoteClick }: NotesListProps) {
  const { uuid } = useParams<string>();
  return (
    <div>
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
          onClick={() => onNoteClick?.(note.uuid)}
          key={note.uuid}
        />
      ))}
    </div>
  );
}
