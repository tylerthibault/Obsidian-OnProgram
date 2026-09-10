import { FuzzySuggestModal, TFile, type App } from "obsidian";
import { listOnProgramBases } from "../services/bases/LinkedOnProgramBase";

export class OnProgramBasePickerModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly onChooseBase: (file: TFile) => void,
    private readonly excludedPath?: string
  ) {
    super(app);
    this.setPlaceholder("Choose an OnProgram Base…");
  }

  getItems(): TFile[] {
    return listOnProgramBases(this.app).filter((file) => file.path !== this.excludedPath);
  }

  getItemText(file: TFile): string {
    return file.path.replace(/\.base$/i, "");
  }

  onChooseItem(file: TFile): void {
    this.onChooseBase(file);
  }
}
