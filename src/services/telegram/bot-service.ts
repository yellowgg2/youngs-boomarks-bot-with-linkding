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
import fs from "fs";
import TelegramModel from "../../models/telegram-model";
import { LF } from "../../language/language-factory";

enum CheckReplyForDelete {
  StopProcessing = 1,
  KeepProcessing
}

export default class BotService {
  private static instance: BotService;

  private _tm = new TelegramModel();

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
    botInstance.on("callback_query", async msg => {});
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
  ): void {
    botInstance.sendMessage(chatId, msg, options).catch(e => glog.error(e));
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

  //   private sendFileTypeButtons(
  //     chatId: number,
  //     msg: string,
  //     setType: boolean = false
  //   ) {
  //     let ik = new InlineKeyboard();
  //     let firstRow = new Row<InlineKeyboardButton>();
  //     let secondRow = new Row<InlineKeyboardButton>();

  //     let _firstRowFormatButtons = [
  //       new InlineKeyboardButton("mp3", "callback_data", "mp3"),
  //       new InlineKeyboardButton("mp4", "callback_data", "mp4"),
  //       new InlineKeyboardButton("m4a", "callback_data", "m4a")
  //     ];

  //     let _secondRowFormatButtons = [
  //       new InlineKeyboardButton("flac", "callback_data", "flac"),
  //       new InlineKeyboardButton("ogg", "callback_data", "ogg"),
  //       new InlineKeyboardButton("wav", "callback_data", "wav"),
  //       new InlineKeyboardButton("webm", "callback_data", "webm")
  //     ];

  //     firstRow.push(..._firstRowFormatButtons);
  //     secondRow.push(..._secondRowFormatButtons);

  //     ik.push(firstRow);
  //     ik.push(secondRow);
  //     if (setType === true) {
  //       // 파일 타입 삭제 버튼
  //       let thirdRow = new Row<InlineKeyboardButton>();
  //       thirdRow.push(new InlineKeyboardButton("none", "callback_data", "none"));
  //       ik.push(thirdRow);
  //     }
  //     this.sendMsg(chatId, msg, {
  //       reply_markup: ik.getMarkup()
  //     });
  //   }

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
        let valid = /^(http|https):\/\/[^ "]+$/.test(msg.text!);
        if (valid === true) {
          // 북마크 생성 : URL 형식
        } else {
          // 북마크 찾기 : #태그1 #태그2 #태그3 or 단어1 단어2 단어3
          //   let words = msg.text?.replace(/\s/g, "").split(",");
          //   console.log(words);
          let userToken = await DbHandler.getLinkdingTokenForUser(username!);
          if (userToken?.[0]?.token) {
            let results = await ApiCaller.getInstance().searchBookmark(
              userToken[0].token,
              msg.text ?? "unknown"
            );
            console.log("=======================", results);
          } else {
            this.sendMsg(chatId, "토큰이 없어요!");
          }
        }
      });
    }
  };
}
