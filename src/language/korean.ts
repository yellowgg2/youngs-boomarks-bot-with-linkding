import { ILanguageBot } from "./language-factory";

export default class KoreanBot implements ILanguageBot {
  howToAddUser =
    "π μ¬μ©λ² : /adduser id μ€λͺ [admin/user] [linkding token] [miniflux token]";
  successfullyAdded = "π μ±κ³΅μ μΌλ‘ [[ μΆκ° ]] λμμ΅λλ€";
  howToUpUser =
    "π μ¬μ©λ² : /upuser id μ€λͺ [admin/user] [linkding token] [miniflux token]";
  successfullyUpdated = "π μ±κ³΅μ μΌλ‘ [[ λ³κ²½ ]] λμμ΅λλ€";
  howToDelUser = "π μ¬μ©λ² : /deluser [id]";
  successfullyDeleted = "π μ±κ³΅μ μΌλ‘ [[ μ­μ  ]] λμμ΅λλ€";
  allowedUsers = "β  νμ©λ μ¬μ©μ λͺ©λ‘";
  welcomeMessage = "νμν©λλ€. μ²μ μ€μ λΆμ κ΄λ¦¬μμκ² λ¬ΈμνμΈμ.";
  noAuthUserWarnMsg = "πΌ κΆνμ΄ μμ΅λλ€.\nκ΄λ¦¬μμκ² λ¬ΈμνμΈμ.";
  notAdminWarn = "πΏ λΉμ μ κ΄λ¦¬μκ° μλλλ€";
  notACmd = "π₯ ν΄λΉ λͺλ Ήμ μμ΄μ!";
  thisIsNotURL = "πΏ μ΄κ±΄ URLμ΄ μλμμ!";

  successfullyAddType(type: string): string {
    return `μ±κ³΅μ μΌλ‘ [[ μΆκ° ]] νμ΅λλ€. [${type}]`;
  }

  successfullyDelType(type: string): string {
    return `μ±κ³΅μ μΌλ‘ [[ μ­μ  ]] νμ΅λλ€. [${type}]`;
  }

  newlyAddUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: μλ‘μ΄ μ¬μ©μ μΆκ°λ¨ ${id} - ${desc}`;
  }

  updateUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: μ¬μ©μ κ°±μ  λ¨ ${id} - ${desc}`;
  }

  deleteUserAdminCmd(id: string): string {
    return `Admin Warning: μ¬μ©μ μ­μ  λ¨ ${id}`;
  }

  unauthorizedUserComesIn(username: string): string {
    return `μΈμ¦λμ§ μμ μ¬μ©μ [${username}] κ° λ΄μ μ¬μ©νλ € μλν¨`;
  }

  warningFromBot(msg: string): string {
    return `κ²½κ³  :\n${msg}`;
  }

  public get showHelp(): string {
    let helpMsg = "/help - μ΄ λμλ§ λ³΄κΈ°\n";
    helpMsg += "/feed - miniflux νλμ© λ³΄κΈ°\n";
    helpMsg += "/allusers - λͺ¨λ  μ¬μ©μ λ³΄κΈ°\n\n";
    helpMsg += "κ²μ κΈ°λ₯\n";
    helpMsg += "<u>λ¨μ΄</u>λ‘ κ²μν  λλ spaceλ‘ κ΅¬λΆνμ¬ λ³΄λλλ€\n";
    helpMsg += "μμ) λ¨μ΄1 λ¨μ΄2\n\n";
    helpMsg += "<u>νκ·Έ</u>λ‘ κ²μν  λλ λ¨μ΄ μμ '#'μ λΆμ΄κ³ \n";
    helpMsg += "spaceλ‘ κ΅¬λΆνμ¬ λ³΄λλλ€\n";
    helpMsg += "μμ) #λ¨μ΄1 #λ¨μ΄2\n\n";
    helpMsg += "λΆκ°κΈ°λ₯\n";
    helpMsg +=
      "1. κ²μ ν, μνλ λ§ν¬λ₯Ό replyλ‘ λ€μ μ€ νλμ λ¨μ΄λ₯Ό μλ ₯νλ©΄ μ λ³΄ <u>μμ </u>μ΄ κ°λ₯νλ€\n";
    helpMsg += "μμ) e, edit, μμ \n";
    helpMsg +=
      "2. κ²μ ν, μνλ λ§ν¬λ₯Ό replyλ‘ λ€μ μ€ νλμ λ¨μ΄λ₯Ό μλ ₯νλ©΄ μ λ³΄ <u>μ­μ </u> κ°λ₯νλ€\n";
    helpMsg += "μμ) d, delete, μ­μ \n";

    return helpMsg;
  }

  public get showAdminHelp(): string {
    let helpMsg = "/adduser - μ¬μ©μ μΆκ° λͺλ Ή\n";
    helpMsg += "/upuser - μ¬μ©μ κ°±μ \n";
    helpMsg += "/deluser - μ¬μ©μ μ κ±°\n";

    return helpMsg;
  }

  showDefaultFileTypes(username: string): string {
    return `π [${username}]λμ κΈ°λ³Έ νμΌνμμλλ€\n\n`;
  }
}
