import { runEstateInfo } from "./runEstateInfo";

export const estateInfoService = {
  process: async () => {
    const estate_robo_id = process.env.ESTATE_ROBO_ID ?? "";
    const estate_robo_pass = process.env.ESTATE_ROBO_PASS ?? "";
    if (!estate_robo_id || !estate_robo_pass) {
      return { ok: false, message: "エステートロボの認証情報が不足しています" };
    }
    runEstateInfo(estate_robo_id, estate_robo_pass);
    return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
  }
};
