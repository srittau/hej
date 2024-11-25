import {
  faCaretDown,
  faCaretUp,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Group, Paper, Table, Text, UnstyledButton } from "@mantine/core";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { NoteMeta } from "./Note";
import classes from "./NoteListView.module.css";
import { useNotesMeta } from "./gql";
import { formatDate, formatDateTime } from "./time";

type SortField = "title" | "created" | "modified";
type SortDirection = "asc" | "desc";

export default function NoteListView() {
  const [sortField, direction, sort] = useSort();
  const notes = useSortedNotes(sortField, direction);
  const navigate = useNavigate();
  return (
    <Paper shadow="xs">
      <Table striped withRowBorders={false} highlightOnHover>
        <Table.Thead>
          <Th
            direction={sortField === "title" && direction}
            onSort={() => sort("title")}
          >
            Title
          </Th>
          <Th
            direction={sortField === "created" && direction}
            w="8rem"
            onSort={() => sort("created")}
          >
            Created
          </Th>
          <Th
            direction={sortField === "modified" && direction}
            w="10rem"
            onSort={() => sort("modified")}
          >
            Modified
          </Th>
        </Table.Thead>
        <Table.Tbody>
          {notes.map((note) => (
            <Table.Tr
              className={classes.row}
              onClick={() => void navigate(`/notes/${note.uuid}`)}
              key={note.uuid}
            >
              <Table.Td>{note.title}</Table.Td>
              <Table.Td>{formatDate(note.creationDate)}</Table.Td>
              <Table.Td>{formatDateTime(note.lastChanged)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

interface ThProps {
  direction?: SortDirection | false;
  w?: number | string;
  children: React.ReactNode;
  onSort?: () => void;
}

function Th({ direction, w, children, onSort }: ThProps) {
  const icon =
    direction === "desc"
      ? faCaretDown
      : direction === "asc"
        ? faCaretUp
        : faSort;
  return (
    <Table.Th w={w}>
      <UnstyledButton className={classes.thButton} onClick={onSort}>
        <Group justify="space-between">
          <Text>{children}</Text>
          <FontAwesomeIcon icon={icon} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

function useSort(): [SortField, SortDirection, (sortOrder: SortField) => void] {
  const [field, setField] = useState<SortField>("title");
  const [direction, setDirection] = useState<SortDirection>("asc");

  function onSort(order: SortField) {
    if (order === field) {
      setDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setField(order);
      setDirection("asc");
    }
  }

  return [field, direction, onSort];
}

function useSortedNotes(
  field: SortField,
  direction: SortDirection,
): readonly NoteMeta[] {
  const notes = useNotesMeta();
  return useMemo(() => {
    const sorted = [...notes].sort((n1, n2) => compareNotes(n1, n2, field));
    if (direction === "desc") sorted.reverse();
    return sorted;
  }, [notes, field, direction]);
}

function compareNotes(n1: NoteMeta, n2: NoteMeta, field: SortField): number {
  switch (field) {
    case "title":
      return n1.title.localeCompare(n2.title);
    case "created":
      return n1.creationDate.localeCompare(n2.creationDate);
    case "modified":
      return n1.lastChanged.localeCompare(n2.lastChanged);
  }
}
