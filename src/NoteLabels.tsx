import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActionIcon, Group, Popover, UnstyledButton } from "@mantine/core";
import { useMemo, useState } from "react";

import { Label, sortLabels } from "./Label";
import { LabelChip } from "./LabelChip";
import { Note } from "./Note";
import classes from "./NoteLabels.module.css";
import { useAllLabels, useNoteLabels } from "./gql";

interface NoteLabelsProps {
  note: Note;
}

/** Shows the labels of a note and allows attaching and detaching labels. */
export default function NoteLabels({ note }: NoteLabelsProps) {
  const [attach, detach, loading] = useNoteLabels(note.uuid);
  const [opened, setOpened] = useState(false);
  const attached = useMemo(() => sortLabels(note.labels), [note.labels]);
  const available = useAvailableLabels(note.labels);

  return (
    <Group gap="xs">
      {attached.map((label) => (
        <LabelChip
          label={label}
          onRemove={() => void detach(label.uuid)}
          key={label.uuid}
        />
      ))}
      {available.length > 0 && (
        <Popover
          opened={opened}
          onChange={setOpened}
          position="bottom-start"
          shadow="md"
        >
          <Popover.Target>
            <ActionIcon
              variant="subtle"
              size="sm"
              title="Add label"
              aria-label="Add label"
              disabled={loading}
              onClick={() => setOpened((o) => !o)}
            >
              <FontAwesomeIcon icon={faPlus} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown maw="20rem">
            <Group gap="xs">
              {available.map((label) => (
                <UnstyledButton
                  className={classes.chipButton}
                  aria-label={`Add label ${label.name}`}
                  onClick={() => {
                    setOpened(false);
                    void attach(label.uuid);
                  }}
                  key={label.uuid}
                >
                  <LabelChip label={label} />
                </UnstyledButton>
              ))}
            </Group>
          </Popover.Dropdown>
        </Popover>
      )}
    </Group>
  );
}

function useAvailableLabels(attached: readonly Label[]): readonly Label[] {
  const [, labels] = useAllLabels();
  return useMemo(() => {
    const attachedUUIDs = new Set(attached.map((l) => l.uuid));
    return sortLabels(labels.filter((l) => !attachedUUIDs.has(l.uuid)));
  }, [labels, attached]);
}
