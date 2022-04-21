import axios from "axios";
import { glog } from "../logger/custom-logger";
import { IBookmarkInfo } from "../../models/telegram-model";
require("dotenv").config();

export interface IPlayList {
  title: string;
  items: Array<IPlayListItem>;
}

export interface IPlayListItem {
  title: string;
  link: string;
}

export default class ApiCaller {
  private static instance: ApiCaller;
  private _baseUrl = process.env.LINKDING_URL;
  private _miniBaseUrl = process.env.MINIFLUX_URL;

  private constructor() {}

  static getInstance() {
    if (!ApiCaller.instance) {
      ApiCaller.instance = new ApiCaller();
    }

    return ApiCaller.instance;
  }

  /**
   *
   * @param token Linkding token
   * @param searchQuery q param (ex: title, or #title for tag)
   * @param limit limit
   * @param offset offset
   */
  async searchBookmark(
    token: string,
    searchQuery: string,
    limit: number = 5,
    offset: number = 0
  ) {
    let res = await axios.get(`${this._baseUrl}/api/bookmarks/`, {
      headers: {
        Authorization: `Token ${token}`
      },
      params: { q: searchQuery, limit, offset }
    });

    if (res.status !== 200) {
      glog.error(`[Line - 56][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
    return res.data;
  }

  async createBookmark(token: string, url: string, tags: Array<string>) {
    let payload = {
      url,
      tag_names: tags
    };
    let res = await axios.post(`${this._baseUrl}/api/bookmarks/`, payload, {
      headers: {
        Authorization: `Token ${token}`
      }
    });

    if (res.status >= 400) {
      glog.error(`[Line - 74][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
  }

  async updateBookmark(token: string, info: IBookmarkInfo) {
    let payload = {
      url: info.url,
      title: info.title ?? "Not Assigned",
      description: info.desc ?? "Not Assigned",
      tag_names: info.tags ?? ["Not Assigned"]
    };

    console.table(payload);

    let res = await axios.put(
      `${this._baseUrl}/api/bookmarks/${info.bookmarkId}`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`
        }
      }
    );

    if (res.status >= 400) {
      glog.error(`[Line - 94][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
  }

  async deleteBookmark(token: string, id: string) {
    let res = await axios.delete(`${this._baseUrl}/api/bookmarks/${id}`, {
      headers: {
        Authorization: `Token ${token}`
      }
    });

    if (res.status >= 400) {
      glog.error(`[Line - 107][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
  }

  // /v1/entries?status=unread&direction=desc
  async getUnreadArticle(token: string) {
    let res = await axios.get(`${this._miniBaseUrl}/v1/entries`, {
      headers: {
        "X-Auth-Token": token
      },
      params: { status: "unread", direction: "desc", limit: 1, offset: 0 }
    });

    if (res.status >= 400) {
      glog.error(`[Line - 124][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
    return res.data;
  }

  async markAsReadAnArticle(token: string, id: number) {
    let res = await axios.put(
      `${this._miniBaseUrl}/v1/entries`,
      { entry_ids: [id], status: "read" },
      {
        headers: {
          "X-Auth-Token": token,
          "Content-Type": "application/json"
        }
      }
    );

    if (res.status >= 400) {
      glog.error(
        `[Line - 136][File - api-caller.ts] ${res.statusText} ${res.status}`
      );
      throw res.statusText;
    }
  }
}
