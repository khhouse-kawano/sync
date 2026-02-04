import { runWeekday } from './runWeekday';
export const weekdayService = {
    process: async (postData: any) => {
        try {
            await runWeekday(postData);
            return {
                ok: true,
                message: `${new Date().toISOString()}_週末キャンペーンのメール送信`
            };
        } catch (error) {
            console.error("runWeekday error:", error);
            return {
                ok: false,
                message: "メール送信に失敗しました"
            };
        }
    }
};
