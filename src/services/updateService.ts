import { idList, brandList } from "../utils/valueList";
import { formattedShop } from "../utils/function";
import { runDataUpdateNew } from "./runDataUpdateNew";
import { runDataUpdateBeforeInterview } from "./runDataUpdateBeforeInterview";
import { runDataUpdateAfterInterview } from "./runDataUpdateAfterInterview";

type BrandKey = keyof typeof brandList;
const keys = Object.keys(brandList) as BrandKey[];

export const updateService = {
  process: async (postData: any) => {
    let shopValue = "";
    if (postData.shop) {
      shopValue = formattedShop(postData.shop);
    } else if (postData.in_charge_store) {
      shopValue = formattedShop(postData.in_charge_store);
    }
    console.log(postData);
    const selectedShop = idList.find(item => item.shop === shopValue);
    const pg_mail = selectedShop?.mail ?? "";
    const pg_pass = "4081Marketing";

    const key = keys.find(k => shopValue.toLowerCase().startsWith(k));
    const brand = key ? brandList[key] : "";

    if (postData.request === "before_interview") {
      runDataUpdateBeforeInterview(postData, brand, pg_mail, pg_pass);
    } else if (postData.request === "after_interview") {
      runDataUpdateAfterInterview(postData, brand, pg_mail, pg_pass);
    } else {
      runDataUpdateNew(postData, brand, pg_mail, pg_pass);
    }

    return { message: `${new Date().toISOString()}_アップデートを開始しました` };
  }
};
