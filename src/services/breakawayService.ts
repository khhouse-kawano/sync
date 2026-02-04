import axios from "axios";

export const breakawayService = {
    process: async (postData: any) => {
        try {
            console.log("受信データ:", postData);

            const parsed =
                typeof postData === "string" ? JSON.parse(postData) : postData;

            const data = { ...parsed, demand: "breakaway" };
            console.log("送信データ:", data);

            const headers = {
                Authorization: "4081Kokubu",
                "Content-Type": "application/json",
            };

            const response = await axios.post(
                "https://khg-marketing.info/dashboard/api/",
                data,
                { headers }
            );

            console.log("APIレスポンス:", response.data);
        } catch (error: any) {
            console.error("エラー:", error.response?.data || error.message);
        }
    }
};
