export enum TypeMode {
  Normal = 1,
  TagInput,
  TitleEditing,
  DescEditing,
  TagEditing
}

export interface IBookmarkInfo {
  url: string;
  bookmarkId: string;
  title?: string;
  desc?: string;
  tags?: Array<String>;
}

export default class TelegramModel {
  private users: { [key: string]: any } = {};
  private editingBookmark: { [key: string]: any } = {};

  setMode(username: string, mode: TypeMode) {
    this.users = {
      ...this.users,
      [username]: mode
    };
  }

  getMode(username: string) {
    return this.users[username] ?? TypeMode.Normal;
  }

  setBookmarkForUser(username: string, bookmark: IBookmarkInfo) {
    this.editingBookmark = {
      ...this.editingBookmark,
      [username]: bookmark
    };
  }

  deleteBookmarkForUser(username: string) {
    delete this.editingBookmark[username];
  }

  getBookmarkForUser(username: string): IBookmarkInfo {
    return (
      this.editingBookmark[username] ?? {
        url: "",
        bookmarkId: "0",
        title: "",
        desc: ""
      }
    );
  }

  setEndOfEditing(username: string) {
    this.users = {
      ...this.users,
      [username]: TypeMode.Normal
    };
  }
}
