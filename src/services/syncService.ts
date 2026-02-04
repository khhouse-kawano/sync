import { idList, brandList } from "../utils/valueList";
import { formattedShop } from "../utils/function";
import { runDataRegistration } from "./runDataRegistration";
import { runDataRegistrationBeforeInterview } from "./runDataRegistrationBeforeInterview";

type BrandKey = keyof typeof brandList;
const keys = Object.keys(brandList) as BrandKey[];

export const syncService = {
  process: async (postData: any) => {
    const shopValue = formattedShop(postData.shop);
    console.log(postData);
  
    const selectedShop = idList.find(item => item.shop === shopValue);
    const pg_mail = selectedShop?.mail ?? "";
    const pg_pass = process.env.PG_PASS ?? "";

    const key = keys.find(k => shopValue.toLowerCase().startsWith(k));
    const brand = key ? brandList[key] : "";

    if (postData.request === "before_interview") {
      await runDataRegistrationBeforeInterview(postData, brand, pg_mail, pg_pass);
    } else {
      await runDataRegistration(postData, brand, pg_mail, pg_pass);
    }

    return { message: `${new Date().toISOString()}_同期処理を開始しました` };
  }
};
