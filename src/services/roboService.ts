import { runMyHomeRobo } from "./runMyHomeRobo";

export const roboService = {
  process: async (postData: any) => {
    const robo_id = process.env.ROBO_ID ?? "";
    const robo_pass = process.env.ROBO_PASS ?? "";
    if (!robo_id || !robo_pass) {
      return { ok: false, message: "マイホームロボの認証情報が不足しています" };
    }
    runMyHomeRobo(postData, robo_id, robo_pass);
    return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
  }
};
