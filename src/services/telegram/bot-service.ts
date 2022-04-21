import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";
import {
  InlineKeyboard,
  InlineKeyboardButton,
  Row
} from "node-telegram-keyboard-wrapper";
import { ADMIN_CHATID, botInstance } from "../../global-bot-config";
import ApiCaller from "../axios/api-caller";
import { glog } from "../logger/custom-logger";
import DbHandler from "../sqlite/db-handler";
import TelegramModel, {
  IBookmarkInfo,
  TypeMode
} from "../../models/telegram-model";
import { LF } from "../../language/language-factory";
import url from "url";

enum CheckReplyForEdit {
  StopProcessing = 1,
  KeepProcessing
}

export default class BotService {
  private static instance: BotService;

  private _tm = new TelegramModel();
  private _inputUrl: string | null = null;

  private constructor() {}

  static getInstance() {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }

    return BotService.instance;
  }

  start() {
    botInstance.on("message", this._messageHandler);
    botInstance.on("polling_error", err => console.log(err));
    botInstance.on("callback_query", async msg => {
      let chatId = msg.message?.chat.id;
      let username = msg.from.username;
      let query = msg.data;

      try {
        let queryObj = JSON.parse(query!);
        if (queryObj?.limit && queryObj?.offset) {
          // 찾기 다음 버튼
          this.sendLinks(
            chatId!,
            username!,
            queryObj.q,
            parseInt(queryObj.limit),
            parseInt(queryObj.offset)
          );
        } else if (queryObj?.bmId && queryObj?.t) {
          this.clearOutButtons(msg);
          this.setEditingMode(username!, queryObj.t);
          this.sendEditingMessage(chatId!, username!, queryObj.t);
        }
      } catch (error) {
        glog.error(`[Line - 55][File - bot-service.ts] ${error}`);
      }
    });
  }

  showHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showHelp);
  }

  showAdminHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showAdminHelp);
  }

  async sendEditingMessage(chatId: number, username: string, type: string) {
    let bookmark = this._tm.getBookmarkForUser(username!);
    if (type === "title") {
      this.sendMsg(
        chatId,
        `📘 타이틀을 입력해주세요\n현재타이틀: <code>${bookmark.title}</code>`
      );
    } else if (type === "tag") {
      this.sendMsg(
        chatId,
        `💌 태그를 space로 구분하여 입력해주세요\n\n-- 예시 --\n한국 텔레그램 멋짐\n\n현재태그: <code>${bookmark.tags?.join(
          " "
        )}</code>`
      );
    } else if (type === "desc") {
      this.sendMsg(
        chatId,
        `🌐 설명을 입력해주세요\n현재설명: <code>${bookmark.desc}</code>`
      );
    } else if (type === "end") {
      try {
        let userToken = await DbHandler.getLinkdingTokenForUser(username!);
        if (userToken?.[0]?.token) {
          let bookmark = this._tm.getBookmarkForUser(username!);
          ApiCaller.getInstance()
            .updateBookmark(
              process.env.NODE_ENV !== "production"
                ? process.env.LINKDING_ADMIN_TOKEN
                : userToken[0].token,
              bookmark
            )
            .then(() => {
              this._tm.setMode(username, TypeMode.Normal);
              this._tm.deleteBookmarkForUser(username);
              this.sendMsg(chatId, LF.str.successfullyUpdated);
            })
            .catch(e => {
              this.sendMsg(chatId, `😱 ${e}`);
            });
        }
      } catch (error) {
        glog.error(`[Line - 93][File - bot-service.ts] ${error}`);
      }
    }
  }

  clearOutButtons(msg: TelegramBot.CallbackQuery) {
    botInstance.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: msg.from?.id,
        message_id: msg.message?.message_id
      }
    );
  }

  setEditingMode(username: string, type: string) {
    if (type === "title") {
      glog.info(`[Line - 104][File - bot-service.ts] Enter title editing mode`);
      this._tm.setMode(username, TypeMode.TitleEditing);
    } else if (type === "tag") {
      glog.info(`[Line - 108][File - bot-service.ts] Enter tag editing mode`);
      this._tm.setMode(username, TypeMode.TagEditing);
    } else if (type === "desc") {
      glog.info(`[Line - 110][File - bot-service.ts] Enter desc editing mode`);
      this._tm.setMode(username, TypeMode.DescEditing);
    }
  }

  sendMsg(
    chatId: number,
    msg: string,
    options: SendMessageOptions = { parse_mode: "HTML" }
  ): Promise<TelegramBot.Message | null> {
    return botInstance.sendMessage(chatId, msg, options).catch(e => {
      glog.error(e);
      return null;
    });
  }

  sendMsgToAdmin(msg: string): void {
    botInstance.sendMessage(ADMIN_CHATID, LF.str.warningFromBot(msg), {
      parse_mode: "HTML"
    });
  }

  async checkAuthUser(username?: string): Promise<void> {
    if (!username) {
      this.sendMsgToAdmin(LF.str.unauthorizedUserComesIn("Unknown"));
      throw "whoisthis";
    }
    let auth = await DbHandler.isExistingUsername(username);
    if (auth) {
      return;
    } else {
      this.sendMsgToAdmin(LF.str.unauthorizedUserComesIn(username));
      throw "no-auth";
    }
  }

  addUser(
    chatId: number,
    id: string | undefined,
    name: string | undefined,
    token: string = "",
    type: string = "user"
  ) {
    if (!id || !name) {
      this.sendMsg(chatId, LF.str.howToAddUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.newlyAddUserAdminCmd(id, name));
    DbHandler.insertNewUser(id, name, token, type)
      .then(() => this.sendMsg(chatId, LF.str.successfullyAdded))
      .catch(e => glog.error(e));
  }

  upUser(
    chatId: number,
    id: string | undefined,
    name: string | undefined,
    token: string = "",
    type: string = "user"
  ) {
    if (!id || !name) {
      this.sendMsg(chatId, LF.str.howToUpUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.updateUserAdminCmd(id, name));
    DbHandler.updateUser(id, name, token, type)
      .then(() => this.sendMsg(chatId, LF.str.successfullyUpdated))
      .catch(e => glog.error(e));
  }

  delUser(chatId: number, id: string | undefined) {
    if (!id) {
      this.sendMsg(chatId, LF.str.howToDelUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.deleteUserAdminCmd(id));
    DbHandler.deleteUser(id)
      .then(() => this.sendMsg(chatId, LF.str.successfullyDeleted))
      .catch(e => glog.error(e));
  }

  showAllUsers(chatId: number) {
    DbHandler.getAllUsers().then(users => {
      let allUsers = `${LF.str.allowedUsers}\n\n`;
      for (let user of users) {
        allUsers += `🎫 ${user.username}\n`;
        allUsers += `🤶 ${user.first_name}\n`;
        allUsers += `---------------------\n`;
      }
      this.sendMsg(chatId, allUsers);
    });
  }

  startBot(chatId: number) {
    this.sendMsg(chatId, LF.str.welcomeMessage);
  }

  authUserCommand(
    chatId: number,
    username: string | undefined,
    callback: () => any
  ) {
    if (!username) {
      this.sendMsg(chatId, LF.str.noAuthUserWarnMsg);
      return;
    }
    this.checkAuthUser(username)
      .then(() => {
        callback();
      })
      .catch(e => this.sendMsg(chatId, LF.str.noAuthUserWarnMsg));
  }

  adminCommand(
    chatId: number,
    username: string | undefined,
    callback: () => any
  ) {
    if (!username) {
      return;
    }
    DbHandler.isAdminUser(username)
      .then(async admin => {
        if (admin) {
          callback();
        } else {
          this.sendMsg(chatId, LF.str.notAdminWarn);
        }
      })
      .catch(e => glog.error(e));
  }

  private sendNextButton(chatId: number, totalCount: number, query: any) {
    let ik = new InlineKeyboard();
    let firstRow = new Row<InlineKeyboardButton>();

    let _firstRowFormatButtons = [
      new InlineKeyboardButton("다음", "callback_data", JSON.stringify(query))
    ];

    firstRow.push(..._firstRowFormatButtons);

    ik.push(firstRow);
    this.sendMsg(
      chatId,
      `😏 다음 결과를 가져오려면 다음 버튼을 눌러주세요\n💬남은 개수: [ ${
        totalCount - query.offset
      } ] 항목`,
      {
        reply_markup: ik.getMarkup()
      }
    );
  }

  private sendEditButton(chatId: number, bookmark: IBookmarkInfo) {
    let ik = new InlineKeyboard();
    let firstRow = new Row<InlineKeyboardButton>();
    let secondRow = new Row<InlineKeyboardButton>();

    let _firstRowFormatButtons = [
      new InlineKeyboardButton(
        "타이틀",
        "callback_data",
        JSON.stringify({ bmId: bookmark.bookmarkId, t: "title" })
      ),
      new InlineKeyboardButton(
        "설명",
        "callback_data",
        JSON.stringify({ bmId: bookmark.bookmarkId, t: "desc" })
      ),
      new InlineKeyboardButton(
        "태그",
        "callback_data",
        JSON.stringify({ bmId: bookmark.bookmarkId, t: "tag" })
      )
    ];

    let _secondRowFormatButtons = [
      new InlineKeyboardButton(
        "저장 및 종료",
        "callback_data",
        JSON.stringify({ bmId: bookmark.bookmarkId, t: "end" })
      )
    ];

    firstRow.push(..._firstRowFormatButtons);
    secondRow.push(..._secondRowFormatButtons);

    ik.push(firstRow);
    ik.push(secondRow);

    let bodyMessage = `😏 수정을 원하는 항목을 선택해주세요\n\n`;
    bodyMessage += `현재정보\ntitle: ${bookmark.title}\n`;
    bodyMessage += `desc: ${bookmark.desc ?? "Not Assigned"}\n`;
    bodyMessage += `tags: ${bookmark.tags?.join(" ") ?? "Not Assigned"}`;
    this.sendMsg(chatId, bodyMessage, {
      reply_markup: ik.getMarkup()
    });
  }

  async sendLinks(
    chatId: number,
    username: string,
    searchText: string,
    limit: number = 5,
    offset: number = 0
  ) {
    // 북마크 찾기 : #태그1 #태그2 #태그3 or 단어1 단어2 단어3
    //   let words = msg.text?.replace(/\s/g, "").split(",");
    //   console.log(words);
    let userToken = await DbHandler.getLinkdingTokenForUser(username!);
    if (userToken?.[0]?.token) {
      let bookmarks = await ApiCaller.getInstance().searchBookmark(
        process.env.NODE_ENV !== "production"
          ? process.env.LINKDING_ADMIN_TOKEN
          : userToken[0].token,
        searchText,
        limit,
        offset
      );

      let messagesPromise = [];
      if (bookmarks.results.length === 0) {
        this.sendMsg(chatId, "😜 검색 결과가 없습니다.");
        return;
      }

      for (let bookmark of bookmarks.results) {
        let sendBackMessage = "";
        let title = bookmark.title || bookmark.website_title || "Not Assigned";
        let desc =
          bookmark.description ||
          bookmark.website_description ||
          "Not Assigned";
        let tags =
          bookmark.tag_names.length > 0
            ? (bookmark.tag_names as []).map(v => `#${v}`).join(" ")
            : "없음";
        sendBackMessage += `🎫 ID: ${bookmark.id}\n`;
        sendBackMessage += `🛒 Title: ${title}\n`;
        sendBackMessage += `🔰 Desc: ${desc}\n`;
        sendBackMessage += `🍒 Tags: <code>${tags}</code>\n`;

        sendBackMessage += `${bookmark.url}`;
        messagesPromise.push(this.sendMsg(chatId, sendBackMessage));
      }
      Promise.all(messagesPromise).then(() => {
        if (bookmarks.next) {
          let q = url.parse(bookmarks.next, true);
          this.sendNextButton(chatId, bookmarks.count, q.query);
        }
      });
    } else {
      this.sendMsg(chatId, "😒 토큰이 없어요!");
    }
  }

  private isEditWords(text: string): boolean {
    return text === "수정" || text === "e" || text === "edit";
  }

  private isDeleteWords(text: string): boolean {
    return text === "삭제" || text === "d" || text === "delete";
  }

  private isEditingMode(mode: TypeMode): boolean {
    return (
      mode === TypeMode.TitleEditing ||
      mode === TypeMode.DescEditing ||
      mode === TypeMode.TagEditing
    );
  }

  checkReplyAndParseCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    let bookmarkInfo = msg.reply_to_message?.text?.split("\n");
    let bookmarkId = bookmarkInfo?.[0] ?? null;
    let title = bookmarkInfo?.[1] ?? undefined;
    let desc = bookmarkInfo?.[2] ?? undefined;
    let tagStr = bookmarkInfo?.[3] ?? undefined;
    let url = bookmarkInfo?.[4] ?? undefined;
    let tags = Array<string>();
    if (tagStr) {
      tagStr = tagStr.replace(/#/g, "");
      tagStr = tagStr.split(": ")[1];
      tags = tagStr.split(" ");
    }

    if (bookmarkId !== null && this.isEditWords(msg.text ?? "")) {
      let uniqueId = bookmarkId.split(": ")[1];
      title = title ? title.split(": ")[1] : "Not Assigned";
      desc = desc ? desc.split(": ")[1] : "Not Assigned";
      this._tm.setBookmarkForUser(username!, {
        url: url!,
        bookmarkId: uniqueId,
        title,
        desc,
        tags
      });
      glog.info(
        `[Line - 396][File - bot-service.ts] Enter Editing Mode\nid: ${uniqueId}\ntitle: ${title}\ndesc: ${desc}\ntags: ${tagStr}`
      );
      this.sendEditButton(chatId, this._tm.getBookmarkForUser(username!));
      return CheckReplyForEdit.StopProcessing;
    } else if (bookmarkId !== null && this.isDeleteWords(msg.text!)) {
      let uniqueId = bookmarkId.split(": ")[1];
      DbHandler.getLinkdingTokenForUser(username!).then(userToken => {
        if (userToken?.[0]?.token) {
          ApiCaller.getInstance()
            .deleteBookmark(
              process.env.NODE_ENV !== "production"
                ? process.env.LINKDING_ADMIN_TOKEN
                : userToken[0].token,
              uniqueId
            )
            .then(() => {
              this.sendMsg(chatId, LF.str.successfullyDeleted);
            })
            .catch(e => this.sendMsg(chatId, `😱 ${e}`));
        }
      });
      return CheckReplyForEdit.StopProcessing;
    } else if (
      bookmarkId !== null &&
      !this.isEditWords(msg.text!) &&
      !this.isDeleteWords(msg.text!)
    ) {
      this.sendMsg(chatId!, LF.str.notACmd);
      return CheckReplyForEdit.StopProcessing;
    }
    return CheckReplyForEdit.KeepProcessing;
  }

  handleAddBookmark(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const username = msg.from?.username;
    let valid = /^(http|https):\/\/[^ "]+$/.test(msg.text!);

    if (valid === true) {
      this.sendMsg(
        chatId,
        "💌 태그를 space로 구분하여 입력해주세요\n\n-- 예시 --\n한국 텔레그램 멋짐"
      );
      this._inputUrl = msg.text!;
      this._tm.setMode(username!, TypeMode.TagInput);
    } else {
      this.sendLinks(chatId, username!, msg.text ?? "unknown").catch(e =>
        glog.error(`[Line - 290][File - bot-service.ts] ${e}`)
      );
    }
  }

  async handleTagInputMode(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    try {
      let userToken = await DbHandler.getLinkdingTokenForUser(username!);
      if (userToken?.[0]?.token) {
        let tags = msg.text?.split(" ") ?? [];
        await ApiCaller.getInstance().createBookmark(
          process.env.NODE_ENV !== "production"
            ? process.env.LINKDING_ADMIN_TOKEN
            : userToken[0].token,
          this._inputUrl!,
          tags
        );
        this.sendMsg(chatId, LF.str.successfullyAdded);
      } else {
        this.sendMsg(chatId, "😒 토큰이 없어요!");
      }
      this._tm.setMode(username!, TypeMode.Normal);
    } catch (error) {
      glog.error(`[Line - 464][File - bot-service.ts] ${error}`);
      this.sendMsg(chatId, `😱 ${error}`);
    }
  }

  handleEditingMode(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    let bookmark = this._tm.getBookmarkForUser(username!);
    if (this._tm.getMode(username!) === TypeMode.TitleEditing) {
      bookmark.title = msg.text ?? "";
    } else if (this._tm.getMode(username!) === TypeMode.DescEditing) {
      bookmark.desc = msg.text ?? "";
    } else if (this._tm.getMode(username!) === TypeMode.TagEditing) {
      let tags = msg.text?.split(" ") ?? [];
      bookmark.tags = tags ?? [];
    } else {
      return;
    }
    this.sendEditButton(chatId, bookmark);
  }

  private _messageHandler = (msg: TelegramBot.Message): void => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    if (msg.entities && msg.entities[0].type === "bot_command") {
      const cmd = msg.text?.split(" ") ?? [""];
      switch (true) {
        // ----------------------------------- 게스트 메뉴
        case /\/help/.test(cmd[0]):
          this.showHelp(chatId);
          break;
        case /\/start/.test(cmd[0]):
          this.startBot(chatId);
          break;
        case /\/allusers/.test(cmd[0]):
          this.showAllUsers(chatId);
          break;
        // ----------------------------------- 수퍼관리자 메뉴
        case /\/ahelp/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.showAdminHelp(chatId);
          });
          break;
        case /\/adduser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.addUser(chatId, cmd[1], cmd[2], cmd[3], cmd[4]);
          });
          break;
        case /\/upuser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.upUser(chatId, cmd[1], cmd[2], cmd[3], cmd[4]);
          });
          break;
        case /\/deluser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.delUser(chatId, cmd[1]);
          });
          break;
        case /\/feed/.test(cmd[0]):
          this.authUserCommand(chatId, username, async () => {
            let userToken = await DbHandler.getMinifluxTokenForUser(username!);
            if (userToken?.[0]?.miniflux_token) {
              console.log(userToken[0]?.miniflux_token);
              ApiCaller.getInstance()
                .getUnreadArticle(userToken[0]?.miniflux_token)
                .then(async entries => {
                  if (entries.entries.length > 0) {
                    const { id, title, url, published_at } = entries.entries[0];
                    let pubDate = new Date(published_at);
                    let sendBackMessage = "";
                    sendBackMessage += `🎫 ID: ${id}\n`;
                    sendBackMessage += `💌 Title: ${title}\n`;
                    sendBackMessage += `🕑 Publish at: ${pubDate.toLocaleDateString()} ${pubDate.toLocaleTimeString()}\n\n`;
                    sendBackMessage += url;

                    this.sendMsg(chatId, sendBackMessage);
                    await ApiCaller.getInstance().markAsReadAnArticle(
                      userToken[0]?.miniflux_token,
                      id
                    );
                  }
                })
                .catch(e => {
                  //   console.log(e);
                  this.sendMsg(chatId, `😱 ${e}`);
                });
            }
          });
          break;
        default:
          console.log(`${username} - ${msg.text}`);
          break;
      }
      return;
    } else {
      this.authUserCommand(chatId, username, async () => {
        if (this._tm.getMode(username!) === TypeMode.Normal) {
          if (
            this.checkReplyAndParseCommand(msg) ===
            CheckReplyForEdit.StopProcessing
          ) {
            return;
          }
          this.handleAddBookmark(msg);
        } else if (this._tm.getMode(username!) === TypeMode.TagInput) {
          this.handleTagInputMode(msg);
        } else if (this.isEditingMode(this._tm.getMode(username!))) {
          this.handleEditingMode(msg);
        }
      });
    }
  };
}
