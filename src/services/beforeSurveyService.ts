import { runBeforeSurvey } from "./runBeforeSurvey";
import { formattedShop } from "../utils/function";
import { idList } from "../utils/valueList";

export const beforeSurveyService = {
    process: async (postData: any) => {
        const shopValue = formattedShop(postData.shop);
        const selectedShop = idList.find(item => item.shop === shopValue);
        const pg_mail = selectedShop?.mail ?? "";
        const pg_pass = process.env.PG_PASS ?? "";

        runBeforeSurvey(postData, pg_mail, pg_pass);
        return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
    }
};
