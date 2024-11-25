import {
  LoaderFunction,
  RouterProvider,
  createBrowserRouter,
  redirect,
} from "react-router";

import AppPage from "./AppPage";
import ErrorPage from "./ErrorPage";
import LoginPage from "./LoginPage";
import NoNote from "./NoNote";
import NoteEditor from "./NoteEditor";
import NoteListView from "./NoteListView";
import NoteView from "./NoteView";
import { isLoggedIn } from "./auth";
import {
  allNotesMetaLoader,
  createNote,
  deleteNote,
  lastestNotesLoader,
  login,
  logout,
  noteLoader,
  queryClient,
} from "./gql";

function privateLoader(loader: LoaderFunction): LoaderFunction {
  return ({ request, ...args }) => {
    const url = new URL(request.url);
    const loginUrl = `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
    if (!isLoggedIn()) return redirect(loginUrl);
    return loader({ request, ...args });
  };
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    async action({ request }) {
      const formData = await request.formData();
      const password = formData.get("password");
      if (!(typeof password === "string")) return false;
      if (await login(password)) {
        const params = new URLSearchParams(window.location.search);
        return redirect(params.get("next") ?? "/");
      } else {
        return false;
      }
    },
  },
  {
    path: "/logout",
    async action() {
      await logout();
      return redirect("/login");
    },
  },
  {
    element: <AppPage />,
    errorElement: <ErrorPage />,
    loader: privateLoader(lastestNotesLoader(queryClient, 3)),
    children: [
      {
        path: "/",
        element: <NoNote />,
        loader: privateLoader(allNotesMetaLoader(queryClient)),
      },
      {
        path: "/notes",
        element: <NoteListView />,
        loader: privateLoader(allNotesMetaLoader(queryClient)),
        async action() {
          const note = await createNote();
          return redirect(`/notes/${note.uuid}/editor`);
        },
      },
      {
        path: "/notes/:uuid/editor",
        element: <NoteEditor />,
        loader: privateLoader(noteLoader(queryClient)),
      },
      {
        path: "/notes/:uuid",
        element: <NoteView />,
        loader: privateLoader(noteLoader(queryClient)),
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
