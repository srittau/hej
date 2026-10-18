import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "@mantine/core";
import { Link, useParams } from "react-router";

import { Label } from "./Label";
import { LabelChip } from "./LabelChip";

interface LabelsLinksProps {
  labels: readonly Label[];
  onLabelClick?: (slug: string) => void;
}

export default function LabelsLinks({
  labels,
  onLabelClick,
}: LabelsLinksProps) {
  const { slug } = useParams<string>();
  return (
    <div>
      {labels.map((label) => (
        <NavLink
          component={Link}
          label={<LabelChip label={label} />}
          rightSection={
            label.slug === slug && <FontAwesomeIcon icon={faChevronRight} />
          }
          to={`/labels/${label.slug}`}
          active={label.slug === slug}
          variant="subtle"
          onClick={() => onLabelClick?.(label.slug)}
          key={label.uuid}
        />
      ))}
    </div>
  );
}
