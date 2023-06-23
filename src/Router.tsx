import {
  RouterProvider,
  createBrowserRouter,
  redirect,
} from "react-router-dom";

import AppPage from "./AppPage";
import ErrorPage from "./ErrorPage";
import NoNote from "./NoNote";
import NoteView from "./NoteView";
import {
  allNotesLoader,
  createNote,
  deleteNote,
  noteLoader,
  queryClient,
} from "./gql";

const router = createBrowserRouter([
  {
    element: <AppPage />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <NoNote />,
        loader: allNotesLoader(queryClient),
        async action() {
          const note = await createNote();
          return redirect(`/notes/${note.uuid}`);
        },
      },
      {
        path: "/notes/:uuid",
        element: <NoteView />,
        loader: noteLoader(queryClient),
        async action({ params }) {
          if (!params.uuid) return;
          if (!(await deleteNote(params.uuid))) return;
          return redirect("/");
        },
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
