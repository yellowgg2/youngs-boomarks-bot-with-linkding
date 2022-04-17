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
import TelegramModel, { TypeMode } from "../../models/telegram-model";
import { LF } from "../../language/language-factory";
import url from "url";

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
      let queryObj = JSON.parse(query!);
      this.sendLinks(
        chatId!,
        username!,
        queryObj.q,
        parseInt(queryObj.limit),
        parseInt(queryObj.offset)
      );
    });
  }

  showHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showHelp);
  }

  showAdminHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showAdminHelp);
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
        let title =
          bookmark.title !== ""
            ? bookmark.title.replace(/\|/g, "\\|")
            : bookmark.website_title.replace(/\|/g, "\\|");
        let tags =
          bookmark.tag_names.length > 0
            ? (bookmark.tag_names as []).map(v => `#${v}`).join(" ")
            : "없음";
        sendBackMessage += `🎫 ID: ${bookmark.id}\n`;
        sendBackMessage += `🛒 Title: ${title}\n`;
        sendBackMessage += `🍒 Tags: <code>${tags}</code>\n\n`;

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
        default:
          console.log(`${username} - ${msg.text}`);
          break;
      }
      return;
    } else {
      this.authUserCommand(chatId, username, async () => {
        if (this._tm.getMode(username!) === TypeMode.Normal) {
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
        } else if (this._tm.getMode(username!) === TypeMode.TagInput) {
          // 북마크 생성 : URL 형식
          //   {
          //     "url": "https://github.com/yellowgg2/youngs-ytdl",
          //     "tag_names": [
          //       "tag1",
          //       "tag2",
          //       "github"
          //     ]
          //   }
          let userToken = await DbHandler.getLinkdingTokenForUser(username!);
          if (userToken?.[0]?.token) {
            try {
              let tags = msg.text?.split(" ") ?? [];
              await ApiCaller.getInstance().createBookmark(
                process.env.NODE_ENV !== "production"
                  ? process.env.LINKDING_ADMIN_TOKEN
                  : userToken[0].token,
                this._inputUrl!,
                tags
              );
              this.sendMsg(chatId, LF.str.successfullyAdded);
            } catch (error) {
              this.sendMsg(chatId, `${error}`);
              glog.error(`[Line - 340][File - bot-service.ts] ${error}`);
            }
          } else {
            this.sendMsg(chatId, "😒 토큰이 없어요!");
          }
          this._tm.setMode(username!, TypeMode.Normal);
        }
      });
    }
  };
}
