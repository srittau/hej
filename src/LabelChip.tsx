import { Badge, CloseButton } from "@mantine/core";
import { Link } from "react-router";

import classes from "./LabelChip.module.css";

interface LabelChipProps {
  label: { name: string; slug: string; color: string };
  link?: boolean;
  /** If given, show a remove button that calls this function. */
  onRemove?: () => void;
}

export function LabelChip({ label, link, onRemove }: LabelChipProps) {
  const props = {
    color: label.color,
    variant: "light",
    tt: "none",
    rightSection: onRemove && (
      <CloseButton
        size="xs"
        variant="transparent"
        c="inherit"
        aria-label={`Remove label ${label.name}`}
        onClick={onRemove}
      />
    ),
  } as const;
  if (link) {
    return (
      <Badge
        component={Link}
        to={`/labels/${label.slug}`}
        className={classes.link}
        onClick={(evt: React.MouseEvent) => evt.stopPropagation()}
        {...props}
      >
        {label.name}
      </Badge>
    );
  }
  return <Badge {...props}>{label.name}</Badge>;
}
