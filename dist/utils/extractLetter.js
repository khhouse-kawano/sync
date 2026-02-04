"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLetter = void 0;
const extractLetter = (medium, text, object, target, base) => {
    if (!text)
        return null;
    switch (medium) {
        case 'KH会員登録': {
            const regex = object === 'medium'
                ? new RegExp(`${target}\\s*${base}\\s*\\n\\s*(.*)`)
                : new RegExp(`${target}\\s*${base}\\s*(.*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            if (object === 'zip') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                if (!zipMatch || !zipMatch[1])
                    return '';
                return zipMatch[1].replace(/-/g, '');
            }
            if (object === 'address') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                const addressNumber = text.match(`町村・番地\\s*${base}\\s*(.*)`);
                const numberValue = addressNumber ? addressNumber[1] : '';
                if (zipMatch && zipMatch[0])
                    return `${value.replace(zipMatch[0], '').trim()}${numberValue}`;
                return `${value}${numberValue}`;
            }
            return value;
        }
        case '土地新着ネット': {
            const regex = object === 'area'
                ? new RegExp(`${target}\\s*\\n\\s*(.*)`)
                : new RegExp(`${target}\\s*${base}\\s*(.*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            if (object === 'zip') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                if (!zipMatch || !zipMatch[1])
                    return '';
                return zipMatch[1].replace(/-/g, '');
            }
            if (object === 'address') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                if (zipMatch && zipMatch[0])
                    return value.replace(zipMatch[0], '').trim();
                return value;
            }
            return value;
        }
        case 'JH会員登録': {
            const regex = object === 'area'
                ? new RegExp(`${target}\\s*\\n\\s*(.*)`)
                : new RegExp(`${target}\\s*${base}\\s*(.*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            if (object === 'zip') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                if (!zipMatch || !zipMatch[1])
                    return '';
                return zipMatch[1].replace(/-/g, '');
            }
            if (object === 'address') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                const addressNumber = text.match(`町村・番地\\s*${base}\\s*(.*)`);
                const numberValue = addressNumber ? addressNumber[1] : '';
                if (zipMatch && zipMatch[0])
                    return `${value.replace(zipMatch[0], '').trim()}${numberValue}`;
                return `${value}${numberValue}`;
            }
            return value;
        }
        case 'なごみ会員登録': {
            const regex = object === 'medium'
                ? new RegExp(`${target}\\s*\\n\\s*(.*)`)
                : new RegExp(`${target}\\s*${base}\\s*(.*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            if (object === 'zip') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                if (!zipMatch || !zipMatch[1])
                    return '';
                return zipMatch[1].replace(/-/g, '');
            }
            if (object === 'address') {
                const zipMatch = value.match(/〒\s*([0-9]{3}-?[0-9]{4})?/);
                const addressNumber = text.match(`町村・番地\\s*${base}\\s*(.*)`);
                const numberValue = addressNumber ? addressNumber[1] : '';
                if (zipMatch && zipMatch[0])
                    return `${value.replace(zipMatch[0], '').trim()}${numberValue}`;
                return `${value}${numberValue}`;
            }
            return value;
        }
        case '事前アンケート': {
            const regex = new RegExp(`${target}\\s*${base}([^\\n]*)`);
            const match = text.match(regex);
            const raw = match ? match[1] : '';
            const value = raw.trim();
            return value;
        }
        case '2L会員登録': {
            // 正規表現の特殊文字（括弧など）をエスケープ処理する
            const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`${escapedTarget}\\s*${base}\\s*([^\\r\\n]*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            return value;
        }
        case 'カゴスマ資料請求': {
            const regex = new RegExp(`${target}\\s*${base}\\s*([^\\r\\n]*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            const formattedValue = object === 'mobile' ? value.replace(/-/g, '') : value;
            return formattedValue;
        }
        case 'カゴスマ来場予約': {
            const regex = new RegExp(`${target}\\s*${base}\\s*([^\\r\\n]*)`);
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            const formattedValue = object === 'mobile' ? value.replace(/-/g, '') : value;
            return formattedValue;
        }
        case 'ハウジングバザール': {
            let regex;
            if (object === 'area') {
                regex = new RegExp(`${target}\\s*${base}([\\s\\S]*?)(?=◆ TEL)`);
            }
            else if (object === 'address') {
                regex = new RegExp(`${target}\\s*${base}([\\s\\S]*?)(?=◆ 建築予定地)`);
            }
            else {
                regex = new RegExp(`${target}\\s*${base}\\s*([^\\r\\n]*)`);
            }
            const match = text.match(regex);
            const value = match ? match[1].trim() : '';
            let formattedValue;
            if (object === 'area') {
                formattedValue = value.replace(/\n/g, '').replace(/無し/g, '').replace(/有り/g, '').replace(/\s+/g, '');
            }
            else if (object === 'zip') {
                formattedValue = value.replace('〒', '').replace(/-/g, '').replace(/\s+/g, '');
            }
            else if (object === 'address') {
                formattedValue = value.split(/\r?\n/)[1].replace(/\s+/g, '');
            }
            else {
                formattedValue = object === 'mobile' ? value.replace(/-/g, '') : value;
            }
            return formattedValue;
        }
    }
    return;
};
exports.extractLetter = extractLetter;
