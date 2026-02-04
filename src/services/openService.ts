import axios from "axios";

export const openService = {
    process: async (req: any) => {
        const userId = req.query.id;
        const now = new Date();

        console.log(`Opened by ${userId} at ${now}`);

        const postData = {
            demand: "open_myhomerobo_mail",
            id: userId,
            ua: req.headers["user-agent"],
            ip: req.ip,
        };

        try {
            const headers = {
                Authorization: "4081Kokubu",
                "Content-Type": "application/json",
            };

            await axios.post("https://khg-marketing.info/dashboard/api/", postData, {
                headers,
            });

            console.log("開封ログ送信: 成功");
        } catch (error: any) {
            if (error.response) {
                console.error("APIエラー:", error.response.status, error.response.data);
            } else {
                console.error("通信エラー:", error.message);
            }
        }

        // 透明PNG
        const img = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgX9nX9sAAAAASUVORK5CYII=",
            "base64"
        );

        return {
            img,
            headers: {
                "Content-Type": "image/png",
                "Content-Length": img.length,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            }
        };
    }
};
