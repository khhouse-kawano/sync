import { runWeekday } from "./runWeekday";

export const weekdayService = {
    process: async (postData: any) => {
        runWeekday(postData);
        return { ok: true, message: `${new Date().toISOString()}_週末キャンペーンのメール送信` };
    }
}