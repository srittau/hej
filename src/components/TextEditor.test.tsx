import * as enzyme from "enzyme";
import * as React from "react";
import TextEditor from "./TextEditor";

it("renders a <textarea>", () => {
    const editor = enzyme.shallow(<TextEditor/>);
    expect(editor.name()).toEqual("textarea");
    expect(editor.hasClass("w-text-editor")).toBe(true);
});
