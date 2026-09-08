const { Plugin, Notice } = require("obsidian");

module.exports = class OnProgramPlugin extends Plugin {
  async onload() {
    console.log("OnProgram: Plugin loaded");

    new Notice("OnProgram loaded");

    this.addCommand({
      id: "onprogram-test",
      name: "Test OnProgram",
      callback: () => {
        new Notice("OnProgram is working!");
      },
    });
  }

  onunload() {
    console.log("OnProgram: Plugin unloaded");
  }
};
