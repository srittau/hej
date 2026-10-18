import { Badge } from "@mantine/core";
import { Link } from "react-router";

import classes from "./LabelChip.module.css";

interface LabelChipProps {
  label: { name: string; slug: string; color: string };
  link?: boolean;
}

export function LabelChip({ label, link }: LabelChipProps) {
  const props = { color: label.color, variant: "light", tt: "none" } as const;
  if (link) {
    return (
      <Badge
        component={Link}
        to={`/labels/${label.slug}`}
        className={classes.link}
        {...props}
      >
        {label.name}
      </Badge>
    );
  }
  return <Badge {...props}>{label.name}</Badge>;
}
