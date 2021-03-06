/* eslint-disable @typescript-eslint/camelcase, @typescript-eslint/no-explicit-any */
import { Status } from "@/helper/status";
import campsiteService from "@/services/campsiteService";
import { getRequestUrl } from "@/helper/requestUrl";
import { find } from "lodash";
import { LanguageImport } from "@/interfaces/interfaces";
import { ERROR } from "@/helper/errorMessages";

export const state = {
  dictionary: {},
  activeLanguage: "de-DE",
  languages: [],
  importedLanguage: undefined,
  importStatus: Status.Init
};

export const mutations = {
  SAVE_TRANSLATIONS(state: any, translations: object) {
    state.dictionary = translations;
  },
  SAVE_LANGUAGES(state: any, languages: any) {
    state.languages = languages;
  },
  IMPORT_LANGUAGE(state: any, data: any) {
    state.importedLanguage = data;
  },
  CHANGE_IMPORT_STATUS(state: any, status: any) {
    state.importStatus = status;
  }
};

export const actions = {
  fetchTranslations({ commit, dispatch }: any, token: string) {
    return new Promise<void>((resolve, reject) => {
      campsiteService
        .fetchCollectionItems(
          getRequestUrl({
            collectionName: "translations",
            detailedView: "*"
          }),
          token
        )
        .then((response: any) => {
          if (response.status === 200) {
            commit("SAVE_LANGUAGES", response.data.data);
            dispatch("deactivateError");
            resolve();
          } else {
            commit("CHANGE_STATUS", Status.Error);
            dispatch("activateError", ERROR.FETCH_DATA);
            reject();
          }
        })
        .catch((err: any) => {
          commit("CHANGE_STATUS", Status.Error);
          dispatch("activateError", ERROR.FETCH_DATA);
          console.error(err);
          reject();
        });
    });
  },

  setLanguage({ commit }: any, data: LanguageImport) {
    return new Promise<void>(resolve => {
      commit("IMPORT_LANGUAGE", {
        ...data
      });
      resolve();
    });
  },

  patchLanguage({ commit }: any, payload: any) {
    return new Promise<void>((resolve, reject) => {
      const item: any = state.importedLanguage || {};
      if (item.id === payload.id) {
        campsiteService
          .updateItem(payload.token, "translations", item.id, {
            dictionary: item.dictionary
          })
          .then((response: any) => {
            if (response.status === 200) {
              resolve();
            } else {
              commit("CHANGE_IMPORT_STATUS", Status.Error);
              reject();
            }
          })
          .catch((err: any) => {
            commit("CHANGE_IMPORT_STATUS", Status.Error);
            reject();
            console.error(err);
          });
      } else {
        commit("CHANGE_IMPORT_STATUS", Status.NonMatchingIds);
        reject();
      }
    });
  },

  updateLanguage({ dispatch, commit }: any, payload: any) {
    return new Promise<void>((resolve, reject) => {
      commit("CHANGE_IMPORT_STATUS", Status.Loading);
      dispatch("setLanguage", payload.item)
        .then(() => {
          dispatch("patchLanguage", payload)
            .then(() => {
              dispatch("fetchTranslations", payload.token).then(() => {
                commit("CHANGE_IMPORT_STATUS", Status.Ready);
                resolve();
              });
            })
            .catch(() => {
              reject();
            });
        })
        .catch(() => {
          reject();
        });
    });
  }
};

export const getters = {
  i18n: (state: any, getters: any) => {
    const i18n: Element = {};
    interface Element {
      [index: string]: string;
    }
    getters.currentLanguage.dictionary.forEach((element: any) => {
      i18n[element.key] = element.value;
    });
    return i18n;
  },
  currentLanguage: (state: any) => {
    const currentLang = find(state.languages, {
      language: state.activeLanguage
    });
    return currentLang;
  }
};
