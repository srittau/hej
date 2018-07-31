import * as enzyme from "enzyme";
import * as React from "react";
import App from "./App";

it("renders a <div>", () => {
    const app = enzyme.shallow(<App/>);
    expect(app.name()).toEqual("div");
    expect(app.hasClass("w-app")).toBe(true);
});

it("contains a <TextEditor>", () => {
    const app = enzyme.shallow(<App/>);
    expect(app.find("TextEditor").length).toBe(1);
});
