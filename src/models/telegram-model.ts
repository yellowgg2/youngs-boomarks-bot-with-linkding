export enum TypeMode {
  Normal = 1,
  TagInput,
  Editing
}

export default class TelegramModel {
  private users: { [key: string]: any } = {};
  setMode(username: string, mode: TypeMode) {
    this.users = {
      ...this.users,
      [username]: mode
    };
  }

  getMode(username: string) {
    return this.users[username] ?? TypeMode.Normal;
  }
}
