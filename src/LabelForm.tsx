import {
  Alert,
  Button,
  ColorInput,
  Fieldset,
  Group,
  Paper,
  Stack,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { isNotEmpty, matches, useForm } from "@mantine/form";
import { useEffect } from "react";
import { useFetcher } from "react-router";

import FavoriteIcon from "./FavoriteIcon";
import { Label } from "./Label";
import { LabelChip } from "./LabelChip";
import { LabelActionResult, LabelReturnTo } from "./Router";

interface LabelFormProps {
  /** Label to edit. If not given, a new label is created. */
  label?: Label;
  /** Page to return to after editing a label. */
  returnTo?: LabelReturnTo;
  onCancel?: () => void;
  /** Called after a label was created. */
  onCreated?: () => void;
}

export default function LabelForm({
  label,
  returnTo = "label",
  onCancel,
  onCreated,
}: LabelFormProps) {
  const form = useForm({
    initialValues: {
      name: label?.name ?? "",
      color: label?.color ?? SWATCHES[0],
      favorite: label?.favorite ?? false,
    },
    validate: {
      name: isNotEmpty("Name must not be empty"),
      color: matches(/^#[0-9a-f]{6}$/i, "Color must be in #rrggbb format"),
    },
  });
  const fetcher = useFetcher<LabelActionResult>();
  const { setFieldError } = form;
  const error = fetcher.data?.error;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const { label, error } = fetcher.data;
    if (label) {
      onCreated?.();
    } else if (error === "duplicate") {
      setFieldError("name", "A label with this name already exists");
    } else if (error === "invalid") {
      setFieldError("name", "Invalid label name");
    }
  }, [fetcher.state, fetcher.data, onCreated, setFieldError]);

  function handleSubmit(values: typeof form.values) {
    if (label) {
      void fetcher.submit(
        { uuid: label.uuid, returnTo, ...values },
        { method: "patch", action: `/labels/${label.slug}/editor` },
      );
    } else {
      void fetcher.submit(values, { method: "post", action: "/labels" });
    }
  }

  return (
    <Paper p="md" shadow="xs" maw="30rem">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {error === "unknown" && (
            <Alert color="red">This label no longer exists.</Alert>
          )}
          <TextInput
            label="Name"
            required
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            {...form.getInputProps("name")}
          />
          <ColorInput
            label="Color"
            required
            format="hex"
            swatches={SWATCHES}
            swatchesPerRow={6}
            {...form.getInputProps("color")}
          />
          <Fieldset legend="Preview">
            <LabelChip
              label={{
                name: form.values.name || "Label",
                slug: "",
                color: form.values.color,
              }}
            />
          </Fieldset>
          <UnstyledButton
            type="button"
            aria-pressed={form.values.favorite}
            onClick={() =>
              form.setFieldValue("favorite", !form.values.favorite)
            }
          >
            <Group gap="xs">
              <FavoriteIcon starred={form.values.favorite} />
              Favorite
            </Group>
          </UnstyledButton>
          <Group justify="end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={fetcher.state !== "idle"}>
              {label ? "Save" : "Add"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

// Neutral colors first, reddish colors last. Except for slate and taupe,
// these are shade 6 of the Mantine default colors.
const SWATCHES = [
  "#9fa2a5", // gray
  "#334961", // slate
  "#9c7153", // taupe
  "#7950f2", // violet
  "#228be6", // blue
  "#15aabf", // cyan
  "#12b886", // teal
  "#40c057", // green
  "#82c91e", // lime
  "#fab005", // yellow
  "#fd7e14", // orange
  "#fa5252", // red
];
