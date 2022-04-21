import { ILanguageBot } from "./language-factory";

export default class KoreanBot implements ILanguageBot {
  howToAddUser = "🌈 사용법 : /adduser [id] [설명] [token] [admin/user]";
  successfullyAdded = "🌈 성공적으로 [[ 추가 ]] 되었습니다";
  howToUpUser = "🌈 사용법 : /upuser [id] [설명] [token] [admin/user]";
  successfullyUpdated = "🌈 성공적으로 [[ 변경 ]] 되었습니다";
  howToDelUser = "🌈 사용법 : /deluser [id]";
  successfullyDeleted = "🌈 성공적으로 [[ 삭제 ]] 되었습니다";
  allowedUsers = "⚠ 허용된 사용자 목록";
  welcomeMessage = "환영합니다. 처음 오신분은 관리자에게 문의하세요.";
  noAuthUserWarnMsg = "🌼 권한이 없습니다.\n관리자에게 문의하세요.";
  notAdminWarn = "👿 당신은 관리자가 아닙니다";
  notACmd = "😥 해당 명령은 없어요!";
  thisIsNotURL = "👿 이건 URL이 아니잖아!";

  successfullyAddType(type: string): string {
    return `성공적으로 [[ 추가 ]] 했습니다. [${type}]`;
  }

  successfullyDelType(type: string): string {
    return `성공적으로 [[ 삭제 ]] 했습니다. [${type}]`;
  }

  newlyAddUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: 새로운 사용자 추가됨 ${id} - ${desc}`;
  }

  updateUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: 사용자 갱신 됨 ${id} - ${desc}`;
  }

  deleteUserAdminCmd(id: string): string {
    return `Admin Warning: 사용자 삭제 됨 ${id}`;
  }

  unauthorizedUserComesIn(username: string): string {
    return `인증되지 않은 사용자 [${username}] 가 봇을 사용하려 시도함`;
  }

  warningFromBot(msg: string): string {
    return `경고 :\n${msg}`;
  }

  public get showHelp(): string {
    let helpMsg = "/help - 이 도움말 보기\n";
    helpMsg += "/feed - miniflux 하나씩 보기";
    helpMsg += "/allusers - 모든 사용자 보기\n\n";
    helpMsg += "검색 기능\n";
    helpMsg += "<u>단어</u>로 검색할 때는 space로 구분하여 보냅니다\n";
    helpMsg += "예시) 단어1 단어2\n\n";
    helpMsg += "<u>태그</u>로 검색할 때는 단어 앞에 '#'을 붙이고\n";
    helpMsg += "space로 구분하여 보냅니다\n";
    helpMsg += "예시) #단어1 #단어2\n\n";

    return helpMsg;
  }

  public get showAdminHelp(): string {
    let helpMsg = "/adduser - 사용자 추가 명령\n";
    helpMsg += "/upuser - 사용자 갱신\n";
    helpMsg += "/deluser - 사용자 제거\n";

    return helpMsg;
  }

  showDefaultFileTypes(username: string): string {
    return `😍 [${username}]님의 기본 파일타입입니다\n\n`;
  }
}
