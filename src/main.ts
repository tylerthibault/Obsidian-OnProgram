import { Notice, Plugin } from "obsidian";

export default class OnProgramPlugin extends Plugin {
  async onload(): Promise<void> {
    console.log("OnProgram: Plugin loaded");

    new Notice("OnProgram loaded");

    this.addCommand({
      id: "onprogram-test",
      name: "Test OnProgram",
      callback: () => {
        new Notice("OnProgram is working!");
      }
    });
  }

  onunload(): void {
    console.log("OnProgram: Plugin unloaded");
  }
}
