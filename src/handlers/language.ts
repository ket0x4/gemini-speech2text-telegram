import type { Context } from "grammy";
import { getConfig, saveConfig } from "../config.js";
import { escapeHtml } from "../services/gemini.js";
import { formatLanguagesDisplay, parseLanguageInput } from "../services/languages.js";

function isAuthorizedAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }
  const config = getConfig();
  return config.admin_user_ids.includes(userId);
}

export async function handleSetLang(ctx: Context): Promise<void> {
  if (!ctx.chat) {
    return;
  }

  const rawArg = typeof ctx.match === "string" ? ctx.match.trim() : "";
  let targetChatId = ctx.chat.id;
  let langInput = rawArg;

  // If an admin specifies a chat ID as the first token (e.g. /setlang -100123456 tr en)
  const tokens = rawArg.split(/[\s,]+/);
  if (tokens.length > 1 && isAuthorizedAdmin(ctx)) {
    const maybeChatId = Number.parseInt(tokens[0], 10);
    if (!Number.isNaN(maybeChatId)) {
      targetChatId = maybeChatId;
      langInput = tokens.slice(1).join(" ");
    }
  }

  const config = getConfig();
  const targetChatIdStr = targetChatId.toString();

  // No arguments provided: show current configuration and usage instructions
  if (!langInput) {
    const chatLangs = config.chat_languages?.[targetChatIdStr];
    let currentStatus: string;

    if (chatLangs !== undefined) {
      currentStatus = formatLanguagesDisplay(chatLangs);
    } else if (config.default_language_codes && config.default_language_codes.length > 0) {
      currentStatus = `${formatLanguagesDisplay(config.default_language_codes)} (Varsayılan)`;
    } else {
      currentStatus = "Otomatik Algılama (Varsayılan)";
    }

    const message = [
      "🗣️ <b>Dil Ayarları (Speech-to-Text)</b>",
      "",
      `📍 <b>Mevcut Ayar:</b> ${escapeHtml(currentStatus)}`,
      "",
      "<b>Nasıl Kullanılır?</b>",
      "• <code>/setlang tr en</code> — Türkçe konuşurken araya giren İngilizce kelimeleri orijinal haliyle korur (Code-switching)",
      "• <code>/setlang en es</code> — İngilizce konuşurken araya giren İspanyolca kelimeleri korur",
      "• <code>/setlang tr</code> — Yalnızca Türkçe",
      "• <code>/setlang en</code> — Yalnızca İngilizce",
      "• <code>/setlang auto</code> — Otomatik algılamaya sıfırlar",
      "",
      "💡 <i>İpucu: Dil belirterek ortamdaki anlamsız seslerin (tıkırtı, nefes vb.) yabancı dillere benzetilmesini (halüsinasyon) önleyebilirsiniz. Birden fazla dil belirterek iki dilin bir arada konuşulmasını sağlayabilirsiniz.</i>",
    ].join("\n");

    await ctx.reply(message, { parse_mode: "HTML" });
    return;
  }

  const parsed = parseLanguageInput(langInput);

  if (parsed.isReset) {
    await saveConfig((cfg) => {
      if (!cfg.chat_languages) {
        cfg.chat_languages = {};
      }
      delete cfg.chat_languages[targetChatIdStr];
    });

    await ctx.reply("🔄 <b>Dil ayarı sıfırlandı:</b> Otomatik algılama (Tüm diller serbest).", {
      parse_mode: "HTML",
    });
    return;
  }

  if (parsed.invalidTokens.length > 0) {
    const invalidList = parsed.invalidTokens.map((t) => `<code>${escapeHtml(t)}</code>`).join(", ");
    await ctx.reply(
      `⚠️ <b>Tanınmayan dil:</b> ${invalidList}\n\nGeçerli örneklere göz atabilirsiniz: <code>tr</code>, <code>en</code>, <code>es</code>, <code>de</code>, <code>fr</code>, <code>ru</code> veya <code>/setlang tr en</code>`,
      { parse_mode: "HTML" },
    );
    return;
  }

  if (parsed.validCodes.length === 0) {
    await ctx.reply(
      "Lütfen geçerli bir dil kodu veya adı belirtin. Örnek: <code>/setlang tr en</code>",
      { parse_mode: "HTML" },
    );
    return;
  }

  await saveConfig((cfg) => {
    if (!cfg.chat_languages) {
      cfg.chat_languages = {};
    }
    cfg.chat_languages[targetChatIdStr] = parsed.validCodes;
  });

  const display = formatLanguagesDisplay(parsed.validCodes);
  const isMulti = parsed.validCodes.length > 1;

  let note = "";
  if (isMulti) {
    note =
      "\n\n🌐 <i>Belirtilen diller arasında dinamik geçiş (code-switching) aktif; konuşurken kullandığınız yabancı kelimeler orijinal dilinde doğru olarak yazılacaktır.</i>";
  } else if (parsed.validCodes.includes("tr-TR")) {
    note =
      "\n\n💡 <i>İpucu: Konuşurken araya İngilizce kelimeler (yazılım terimleri vb.) katıyorsanız <code>/setlang tr en</code> şeklinde belirtebilirsiniz.</i>";
  }

  await ctx.reply(`✅ <b>Dil ayarlandı:</b> ${escapeHtml(display)}${note}`, {
    parse_mode: "HTML",
  });
}
