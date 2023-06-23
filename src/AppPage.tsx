import { Outlet } from "react-router-dom";

import AddNote from "./AddNote";
import Logout from "./Logout";
import NotesList from "./NotesList";

import "./AppPage.css";

export default function AppPage() {
  return (
    <div className="app-page">
      <NotesList />
      <div className="note-container">
        <Outlet />
      </div>
      <AddNote>Add note</AddNote>
      <Logout />
    </div>
  );
}
