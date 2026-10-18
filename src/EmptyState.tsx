import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Paper, Stack, Text } from "@mantine/core";

import classes from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: IconDefinition;
  message: string;
  /** Optional hint on what to do next. */
  children?: React.ReactNode;
}

/** A placeholder for lists without items or items that don't exist. */
export default function EmptyState({
  icon,
  message,
  children,
}: EmptyStateProps) {
  return (
    <Paper shadow="xs" p="xl">
      <Stack align="center" gap="xs">
        <FontAwesomeIcon icon={icon} size="2x" className={classes.icon} />
        <Text fw={500}>{message}</Text>
        {children && (
          <Text size="sm" c="dimmed" ta="center">
            {children}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
