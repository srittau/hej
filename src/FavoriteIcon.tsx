import { faStar as farStar } from "@fortawesome/free-regular-svg-icons";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import classes from "./FavoriteIcon.module.css";

interface FavoriteIconProps {
  starred?: boolean;
}

export default function FavoriteIcon({ starred }: FavoriteIconProps) {
  return (
    <FontAwesomeIcon
      icon={starred ? faStar : farStar}
      className={classes.favoriteIcon}
    />
  );
}
