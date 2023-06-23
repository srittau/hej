import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  return (
    <div className="error-page">
      <h1>
        {isRouteErrorResponse(error)
          ? `${error.status} ${error.statusText}`
          : "Unknown error"}
      </h1>
      <div>
        <Link to="/">Back to main page</Link>
      </div>
    </div>
  );
}
