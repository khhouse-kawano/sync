"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunGeoCode = void 0;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.API_KEY;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const RunGeoCode = async () => {
    const fetchLatLng = async (address) => {
        if (!API_KEY) {
            console.error("API_KEYが設定されていません");
            return { lat: null, lng: null };
        }
        if (!address || address.trim() === "") {
            return { lat: null, lng: null };
        }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&key=${API_KEY}`;
        try {
            const res = await axios_1.default.get(url);
            if (res.data.status === "OK") {
                const location = res.data.results[0].geometry.location;
                return { lat: location.lat, lng: location.lng };
            }
            else {
                console.error("Geocoding失敗:", res.data.status, "対象:", address);
                return { lat: null, lng: null };
            }
        }
        catch (err) {
            console.error("APIエラー:", err);
            return { lat: null, lng: null };
        }
    };
    const postLatLng = async (postData, headers) => {
        try {
            const response = await axios_1.default.post("https://khg-marketing.info/dashboard/api/gateway/", postData, { headers });
            // ⭐ 修正: statusだけでなく、PHPから返ってきた生データを全て表示させる
            console.log("POST完了:", JSON.stringify(response.data));
        }
        catch (error) {
            console.error("データ送信エラー:", error);
        }
    };
    const fetchData = async () => {
        try {
            const headers = {
                Authorization: "4081Kokubu",
                "Content-Type": "application/json",
            };
            // === 1. 物件データの処理 ===
            const propertyResponse = await axios_1.default.post("https://khg-marketing.info/dashboard/api/gateway/", { request: "property" }, { headers });
            const propertyList = propertyResponse.data.property;
            const addressList = propertyList.filter((item) => !item.latitude || !item.longitude);
            if (addressList.length > 0) {
                for (const item of addressList) {
                    try {
                        if (!item.address)
                            continue;
                        const { lat, lng } = await fetchLatLng(String(item.address));
                        // POST送信用の変数を準備
                        let postLatStr = "";
                        let postLngStr = "";
                        if (lat === null || lng === null) {
                            console.log(`緯度経度が取得失敗のため「取得不可」として送信: ${item.address}`);
                            // ⭐ 取得できなかった場合の文字列をここで指定します
                            postLatStr = "取得不可";
                            postLngStr = "取得不可";
                        }
                        else {
                            console.log(`住所: ${item.address} → lat: ${lat}, lng: ${lng}`);
                            postLatStr = String(lat);
                            postLngStr = String(lng);
                        }
                        const postData = {
                            id: item.property_number,
                            latitude: postLatStr,
                            longitude: postLngStr,
                            request: "geoCode",
                        };
                        await postLatLng(postData, headers);
                        await sleep(200);
                    }
                    catch (e) {
                        console.error(`ID: ${item.property_number} の処理中にエラー発生:`, e);
                    }
                }
            }
            // === 2. 顧客データの処理 ===
            const customerResponse = await axios_1.default.post("https://khg-marketing.info/dashboard/api/gateway/", { request: "customer_address" }, { headers });
            const customerPropertyList = customerResponse.data.address;
            const customerAddressList = customerPropertyList.filter((item) => item.full_address && item.lat_lng !== '取得不可');
            if (customerAddressList.length > 0) {
                for (const item of customerAddressList) {
                    try {
                        if (!item.full_address)
                            continue;
                        const { lat, lng } = await fetchLatLng(String(item.full_address));
                        // POST送信用の変数を準備
                        let postLatLngStr = "";
                        if (lat === null || lng === null) {
                            console.log(`緯度経度が取得失敗のため「取得不可」として送信: ${item.full_address}`);
                            postLatLngStr = "取得不可";
                        }
                        else {
                            console.log(`住所: ${item.full_address} → lat: ${lat}, lng: ${lng}`);
                            postLatLngStr = `${String(lat)},${String(lng)}`;
                        }
                        const postData = {
                            id: item.id,
                            category: item.category,
                            lat_lng: postLatLngStr,
                            request: "customer_address",
                        };
                        await postLatLng(postData, headers);
                        await sleep(200);
                    }
                    catch (e) {
                        console.error(`ID: ${item.id} の処理中にエラー発生:`, e);
                    }
                }
            }
        }
        catch (e) {
            console.error("データ取得エラー:", e);
        }
    };
    await fetchData();
};
exports.RunGeoCode = RunGeoCode;
