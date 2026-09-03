// portal-app/modelHouse.js からの移植（HOME'S 来場予約の来場先→店舗マッピング用）。
export type ModelHouse = { modelhouse: string; shop: string; brand?: string };

export const modelHouseList: ModelHouse[] = [
    { modelhouse: '八代展示場｜平屋モデルハウス', shop: 'KH八代店', brand: 'KH' },
    { modelhouse: '八代展示場｜2階建てモデルハウス', shop: 'KH八代店', brand: 'KH' },
    { modelhouse: '熊本展示場｜平屋モデルハウス', shop: 'KH熊本店', brand: 'KH' },
    { modelhouse: '大分市今津留｜2階建てモデルハウス', shop: 'KH大分店', brand: 'KH' },
    { modelhouse: '大分展示場｜2階建てモデルハウス', shop: 'KH大分店', brand: 'KH' },
    { modelhouse: '大分展示場｜平屋モデルハウス', shop: 'KH大分店', brand: 'KH' },
    { modelhouse: '都城展示場｜平屋モデルハウス', shop: 'KH都城店', brand: 'KH' },
    { modelhouse: '都城展示場｜2階建てモデルハウス', shop: 'KH都城店', brand: 'KH' },
    { modelhouse: '延岡市出北｜平屋モデルハウス', shop: 'KH延岡店', brand: 'KH' },
    { modelhouse: '宮崎展示場｜平屋モデルハウス', shop: 'KH宮崎店', brand: 'KH' },
    { modelhouse: '宮崎展示場｜2階建てモデルハウ', shop: 'KH宮崎店', brand: 'KH' },
    { modelhouse: '出水阿久根店｜2階建てモデルハウス', shop: 'KH出水阿久根店', brand: 'KH' },
    { modelhouse: '出水阿久根店｜平屋モデルハウス', shop: 'KH出水阿久根店', brand: 'KH' },
    { modelhouse: '姶良展示場｜2階建てモデルハウス', shop: 'KH姶良店', brand: 'KH' },
    { modelhouse: '姶良展示場｜平屋モデルハウス', shop: 'KH姶良店', brand: 'KH' },
    { modelhouse: '薩摩川内展示場｜2階建てモデルハウス', shop: 'KH薩摩川内店', brand: 'KH' },
    { modelhouse: '薩摩川内展示場｜平屋モデルハウス', shop: 'KH薩摩川内店', brand: 'KH' },
    { modelhouse: '鹿屋展示場｜2階建てモデルハウス', shop: 'KH鹿屋店', brand: 'KH' },
    { modelhouse: '鹿屋展示場｜平屋モデルハウス', shop: 'KH鹿屋店', brand: 'KH' },
    { modelhouse: '国分展示場｜2階建てモデルハウス', shop: 'KH霧島店', brand: 'KH' },
    { modelhouse: '国分展示場｜平屋モデルハウス', shop: 'KH霧島店', brand: 'KH' },
    { modelhouse: '鹿児島市宇宿展示場｜2階建てC棟モデルハウス', shop: 'KH鹿児島店', brand: 'KH' },
    { modelhouse: '鹿児島市宇宿展示場｜2階建てB棟モデルハウス', shop: 'KH鹿児島店', brand: 'KH' },
    { modelhouse: '鹿児島市宇宿展示場｜平屋A棟モデルハウス', shop: 'KH鹿児島店', brand: 'KH' },
    { modelhouse: '南さつま市加世田本町｜平屋モデルハウス', shop: 'KH加世田店', brand: 'KH' },
    { modelhouse: '加世田展示場｜平屋モデルハウス', shop: 'KH加世田店', brand: 'KH' },
    { modelhouse: '出水市西出水町｜平屋モデルハウス', shop: 'KH出水阿久根店', brand: 'KH' },
    // 移植元 modelHouse.js 同様、この行だけ brand が未設定（brand 一致の絞り込みに掛からない）
    { modelhouse: '指宿市十町｜平屋モデルハウス', shop: 'KH加世田店' }
];
