import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { Link, useSubmit } from "react-router";

import { Label } from "./Label";
import { useAllLabels } from "./gql";
import FavoriteIcon from "./FavoriteIcon";
import { LabelChip } from "./LabelChip";
import LabelForm from "./LabelForm";

type View = "list" | "add-form";

export default function LabelListView() {
  const [view, setView] = useState<View>("list");

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Labels</Title>
        <Button
          disabled={view === "add-form"}
          onClick={() => setView("add-form")}
        >
          Add label
        </Button>
      </Group>
      {view === "add-form" ? (
        <LabelForm
          onCancel={() => setView("list")}
          onCreated={() => setView("list")}
        />
      ) : (
        <ActualListView />
      )}
    </Stack>
  );
}

function ActualListView() {
  const labels = useSortedLabels();
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);

  if (labels.length === 0) {
    return <Alert w="fit-content">No labels defined.</Alert>;
  }

  return (
    <Paper maw="30rem" shadow="xs">
      <DeleteLabelModal
        label={labelToDelete}
        onClose={() => setLabelToDelete(null)}
      />
      <Table striped withRowBorders={false} highlightOnHover>
        <Table.Thead>
          <Table.Th w="1.5em">
            <FavoriteIcon />
          </Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th />
        </Table.Thead>
        {labels.map((label) => (
          <Table.Tr key={label.uuid}>
            <Table.Td>{label.favorite && <FavoriteIcon starred />}</Table.Td>
            <Table.Td>
              <LabelChip label={label} link />
            </Table.Td>
            <Table.Td>
              <Group gap="xs" justify="end" wrap="nowrap">
                <ActionIcon
                  component={Link}
                  to={`/labels/${label.slug}/editor?from=list`}
                  variant="subtle"
                  title="Edit label"
                  aria-label={`Edit label ${label.name}`}
                >
                  <FontAwesomeIcon icon={faPen} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  title="Delete label"
                  aria-label={`Delete label ${label.name}`}
                  onClick={() => setLabelToDelete(label)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table>
    </Paper>
  );
}

interface DeleteLabelModalProps {
  label: Label | null;
  onClose: () => void;
}

function DeleteLabelModal({ label, onClose }: DeleteLabelModalProps) {
  const submit = useSubmit();
  // Keep showing the last label while the modal's close transition runs.
  const [shownLabel, setShownLabel] = useState(label);
  if (label && label !== shownLabel) setShownLabel(label);

  return (
    <Modal opened={label !== null} withCloseButton={false} onClose={onClose}>
      <Stack>
        <Text size="lg">Delete label “{shownLabel?.name}”?</Text>
        <Text>The label will be removed from all notes.</Text>
        <Group justify="end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={() => {
              if (label) {
                void submit(
                  { uuid: label.uuid },
                  { method: "delete", action: "/labels" },
                );
              }
              onClose();
            }}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function useSortedLabels(): readonly Label[] {
  const [, labels] = useAllLabels();
  return useMemo(
    () => [...labels].sort((l1, l2) => l1.name.localeCompare(l2.name)),
    [labels],
  );
}
