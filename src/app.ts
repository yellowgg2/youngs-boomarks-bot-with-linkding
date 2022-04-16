import ApiCaller from "./services/axios/api-caller";
import { glog } from "./services/logger/custom-logger";
import DbHandler from "./services/sqlite/db-handler";
import DbService from "./services/sqlite/db-service";
import BotService from "./services/telegram/bot-service";

class Starter {
  startServer = async () => {
    await DbService.getInstance()
      .createTable()
      .catch(e => glog.error(e));

    DbHandler.initAuthorizedUsers().catch(e => glog.error(e));

    BotService.getInstance().start();

    process.on("SIGINT", () => {
      process.exit(0);
    });
  };

  startDevServer = async () => {
    await ApiCaller.getInstance().searchBookmark(
      process.env.LINKDING_ADMIN_TOKEN as string,
      "#utils"
    );
  };
}

new Starter().startServer();
// new Starter().startDevServer();
