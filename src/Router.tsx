import {
  RouterProvider,
  createBrowserRouter,
  redirect,
} from "react-router-dom";

import AppPage from "./AppPage";
import ErrorPage from "./ErrorPage";
import NoNote from "./NoNote";
import NoteEditor from "./NoteEditor";
import NoteListView from "./NoteListView";
import NoteView from "./NoteView";
import {
  allNotesMetaLoader,
  createNote,
  deleteNote,
  lastestNotesLoader,
  noteLoader,
  queryClient,
} from "./gql";

const router = createBrowserRouter([
  {
    element: <AppPage />,
    errorElement: <ErrorPage />,
    loader: lastestNotesLoader(queryClient, 3),
    children: [
      {
        path: "/",
        element: <NoNote />,
        loader: allNotesMetaLoader(queryClient),
      },
      {
        path: "/notes",
        element: <NoteListView />,
        loader: allNotesMetaLoader(queryClient),
        async action() {
          const note = await createNote();
          return redirect(`/notes/${note.uuid}/editor`);
        },
      },
      {
        path: "/notes/:uuid/editor",
        element: <NoteEditor />,
        loader: noteLoader(queryClient),
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
