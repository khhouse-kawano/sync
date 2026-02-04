import { google } from "googleapis";

export const addEventService = {
    process: async (body: any) => {
        const { name, startTime, endTime, detail } = body;

        const formattedDate = new Date().toISOString();
        console.log(`${formattedDate}_カレンダー処理開始`);

        console.log(`GOOGLE_CLIENT_ID:${process.env.GOOGLE_CLIENT_ID}
            GOOGLE_CLIENT_SECRET:${process.env.GOOGLE_CLIENT_SECRET}
            GOOGLE_REFRESH_TOKEN:${process.env.GOOGLE_REFRESH_TOKEN}`)

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        const event = {
            summary: `${name}様 架電対応`,
            description: detail,
            start: {
                dateTime: startTime,
                timeZone: "Asia/Tokyo",
            },
            end: {
                dateTime: endTime,
                timeZone: "Asia/Tokyo",
            },
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
        });

        return {
            eventLink: response.data.htmlLink,
        };
    }
};
