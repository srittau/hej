import {
  LoaderFunction,
  RouterProvider,
  createBrowserRouter,
  redirect,
} from "react-router";

import AppPage from "./AppPage";
import EditLabel from "./EditLabel";
import ErrorPage from "./ErrorPage";
import LoginPage from "./LoginPage";
import NoNote from "./NoNote";
import NoteEditor from "./NoteEditor";
import NoteListView from "./NoteListView";
import NoteView from "./NoteView";
import { isLoggedIn } from "./auth";
import {
  UpdateLabelError,
  allLabelsLoader,
  allNotesMetaLoader,
  createLabel,
  createNote,
  deleteLabel,
  deleteNote,
  labelLoader,
  labelNotesLoader,
  lastestNotesLoader,
  login,
  logout,
  noteLoader,
  queryClient,
  updateLabel,
} from "./gql";
import { Label } from "./Label";
import LabelListView from "./LabelListView";
import LabelView from "./LabelView";

function privateLoader(loader: LoaderFunction): LoaderFunction {
  return ({ request, ...args }) => {
    const url = new URL(request.url);
    const loginUrl = `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
    if (!isLoggedIn()) return redirect(loginUrl);
    return loader({ request, ...args });
  };
}

export type LoginError = "invalid" | "error";

/** Page to return to after editing a label. */
export type LabelReturnTo = "list" | "label";

export type LabelActionResult =
  | { label: Label; error?: undefined }
  | { error: UpdateLabelError; label?: undefined };

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    async action({ request }): Promise<Response | LoginError> {
      const formData = await request.formData();
      const password = formData.get("password");
      if (!(typeof password === "string")) return "invalid";
      try {
        if (await login(password)) {
          const params = new URLSearchParams(window.location.search);
          return redirect(params.get("next") ?? "/");
        } else {
          return "invalid";
        }
      } catch (e) {
        console.error("Login error", e);
        return "error";
      }
    },
  },
  {
    path: "/logout",
    async action() {
      try {
        await logout();
      } catch (e) {
        console.error("Logout error", e);
      }
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
        path: "/labels",
        element: <LabelListView />,
        loader: privateLoader(allLabelsLoader(queryClient)),
        async action({ request }): Promise<LabelActionResult | null> {
          const formData = await request.formData();
          if (request.method === "DELETE") {
            const uuid = formData.get("uuid");
            if (typeof uuid === "string") await deleteLabel(uuid);
            return null;
          }
          const name = formData.get("name");
          const color = formData.get("color");
          const favorite = formData.get("favorite") === "true";
          if (typeof name !== "string" || typeof color !== "string") {
            return { error: "invalid" };
          }
          const result = await createLabel(name, color, favorite);
          return typeof result === "string"
            ? { error: result }
            : { label: result };
        },
      },
      {
        path: "/labels/:slug",
        element: <LabelView />,
        loader: privateLoader(async (args) => {
          const [label] = await Promise.all([
            labelLoader(queryClient)(args),
            labelNotesLoader(queryClient)(args),
          ]);
          return label;
        }),
      },
      {
        path: "/labels/:slug/editor",
        element: <EditLabel />,
        loader: privateLoader(labelLoader(queryClient)),
        async action({ request }): Promise<Response | LabelActionResult> {
          const formData = await request.formData();
          const uuid = formData.get("uuid");
          const name = formData.get("name");
          const color = formData.get("color");
          const favorite = formData.get("favorite") === "true";
          if (
            typeof uuid !== "string" ||
            typeof name !== "string" ||
            typeof color !== "string"
          ) {
            return { error: "invalid" };
          }
          const result = await updateLabel(uuid, { name, color, favorite });
          if (typeof result === "string") return { error: result };
          // The slug may have changed, so use the slug of the updated label.
          return redirect(
            formData.get("returnTo") === "list"
              ? "/labels"
              : `/labels/${result.slug}`,
          );
        },
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
