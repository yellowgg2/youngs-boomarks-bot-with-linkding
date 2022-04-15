import axios, { AxiosInstance } from "axios";
import fs from "fs";
import dotenv from "dotenv";
import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";
import AxiosModel from "../../models/axios-model";
import { LF } from "../../language/language-factory";
dotenv.config();

export interface IPlayList {
  title: string;
  items: Array<IPlayListItem>;
}

export interface IPlayListItem {
  title: string;
  link: string;
}

export default class ApiCaller {
  private _axiosCaller: AxiosInstance;
  private static instance: ApiCaller;
  private _baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.LINKDING_URL
      : "http://192.168.4.73:9090";

  private constructor() {
    let token = `Token ${process.env.LINKDING_ADMIN_TOKEN}`;

    this._axiosCaller = axios.create({
      headers: { Authorization: token },
      baseURL: this._baseUrl
    });
  }

  static getInstance() {
    if (!ApiCaller.instance) {
      ApiCaller.instance = new ApiCaller();
    }

    return ApiCaller.instance;
  }

  /**
   *
   * @param searchQuery q param (ex: title, or #title for tag)
   * @param limit limit
   * @param offset offset
   */
  async searchBookmark(
    searchQuery: string,
    limit: number = 100,
    offset: number = 100
  ) {
    let res = await this._axiosCaller.get("/", {
      params: { q: searchQuery, limit, offset }
    });

    console.log(res);
  }
}
