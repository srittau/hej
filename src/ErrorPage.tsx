import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const [title, text] = useError();
  return (
    <div className="error-page">
      <h1>{title}</h1>
      <div>
        <p>{text}</p>
        <Link to="/">Back to main page</Link>
      </div>
    </div>
  );
}

function useError(): [string, string] {
  const error = useRouteError();
  let title = "Unknown error";
  let text = String(error);
  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    title = error.name;
    text = error.message;
  }
  return [title, text];
}
