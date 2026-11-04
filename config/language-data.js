
/* =========================================================
   APPARA CHESS — LANGUAGE DATA
   FILE: config/language-data.js
   PURPOSE: Multilingual UI translations and language setup
   ========================================================= */

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGE_LIST = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", direction: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", direction: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", direction: "ltr" }
];

const ENGLISH = {
  appName: "APPARA CHESS",
  tagline: "The Royal Chess Experience",
  home: "Home",
  play: "Play",
  playNow: "Play Now",
  chessArena: "Chess Arena",
  offline: "Offline",
  online: "Online",
  training: "Training",
  puzzles: "Puzzles",
  tournaments: "Tournaments",
  chessWorld: "Chess World",
  shop: "Shop & Themes",
  leaderboard: "Leaderboard",
  profile: "Profile",
  settings: "Settings",
  about: "About",
  garage: "Collection",
  friends: "Friends",
  messages: "Messages",
  achievements: "Achievements",
  rewards: "Rewards",
  dailyRewards: "Daily Rewards",
  coins: "Coins",
  diamonds: "Diamonds",
  trophies: "Trophies",
  rank: "Rank",
  level: "Level",
  experience: "Experience",
  rating: "Rating",
  history: "Game History",
  review: "Review Game",
  newGame: "New Game",
  resume: "Resume",
  pause: "Pause",
  restart: "Restart",
  undo: "Undo Move",
  draw: "Offer Draw",
  resign: "Resign",
  confirm: "Confirm",
  cancel: "Cancel",
  save: "Save",
  apply: "Apply",
  back: "Back",
  close: "Close",
  loading: "Loading...",
  search: "Search",
  locked: "Locked",
  unlocked: "Unlocked",
  owned: "Owned",
  purchase: "Purchase",
  preview: "Preview",
  select: "Select",
  language: "Language",
  music: "Music",
  sound: "Sound Effects",
  graphics: "Graphics Quality",
  low: "Low",
  medium: "Medium",
  high: "High",
  ultra: "Ultra",
  white: "White",
  black: "Black",
  player: "Player",
  opponent: "Opponent",
  check: "Check",
  checkmate: "Checkmate",
  stalemate: "Stalemate",
  victory: "Victory",
  defeat: "Defeat",
  drawResult: "Draw",
  timeControl: "Time Control",
  difficulty: "Difficulty",
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  expert: "Expert",
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  findMatch: "Find Match",
  createRoom: "Create Room",
  joinRoom: "Join Room",
  inviteFriend: "Invite Friend",
  guest: "Continue as Guest",
  login: "Login",
  signup: "Sign Up",
  logout: "Logout",
  email: "Email",
  password: "Password",
  displayName: "Display Name",
  playerId: "Player ID",
  aboutDeveloper: "Founder & Developer",
  privacy: "Privacy",
  terms: "Terms & Conditions",
  exit: "Exit"
};

const HINDI = {
  appName: "अपारा चेस",
  tagline: "शाही शतरंज का अनुभव",
  home: "होम",
  play: "खेलें",
  playNow: "अभी खेलें",
  chessArena: "चेस एरीना",
  offline: "ऑफलाइन",
  online: "ऑनलाइन",
  training: "ट्रेनिंग",
  puzzles: "पहेलियाँ",
  tournaments: "टूर्नामेंट",
  chessWorld: "चेस वर्ल्ड",
  shop: "शॉप और थीम",
  leaderboard: "लीडरबोर्ड",
  profile: "प्रोफाइल",
  settings: "सेटिंग्स",
  about: "ऐप के बारे में",
  garage: "कलेक्शन",
  friends: "दोस्त",
  messages: "मैसेज",
  achievements: "उपलब्धियाँ",
  rewards: "रिवॉर्ड",
  dailyRewards: "डेली रिवॉर्ड",
  coins: "कॉइन्स",
  diamonds: "डायमंड",
  trophies: "ट्रॉफी",
  rank: "रैंक",
  level: "लेवल",
  experience: "एक्सपीरियंस",
  rating: "रेटिंग",
  history: "गेम हिस्ट्री",
  review: "गेम रिव्यू",
  newGame: "नया गेम",
  resume: "जारी रखें",
  pause: "रोकें",
  restart: "दोबारा शुरू करें",
  undo: "चाल वापस लें",
  draw: "ड्रॉ का प्रस्ताव",
  resign: "हार स्वीकार करें",
  confirm: "पुष्टि करें",
  cancel: "रद्द करें",
  save: "सेव करें",
  apply: "लागू करें",
  back: "वापस",
  close: "बंद करें",
  loading: "लोड हो रहा है...",
  search: "खोजें",
  locked: "लॉक",
  unlocked: "अनलॉक",
  owned: "आपके पास है",
  purchase: "खरीदें",
  preview: "प्रीव्यू",
  select: "चुनें",
  language: "भाषा",
  music: "म्यूजिक",
  sound: "साउंड इफेक्ट",
  graphics: "ग्राफिक्स क्वालिटी",
  low: "कम",
  medium: "मध्यम",
  high: "उच्च",
  ultra: "अल्ट्रा",
  white: "सफेद",
  black: "काला",
  player: "खिलाड़ी",
  opponent: "प्रतिद्वंद्वी",
  check: "शह",
  checkmate: "शह और मात",
  stalemate: "स्टेलमेट",
  victory: "जीत",
  defeat: "हार",
  drawResult: "ड्रॉ",
  timeControl: "समय सीमा",
  difficulty: "कठिनाई",
  easy: "आसान",
  normal: "सामान्य",
  hard: "कठिन",
  expert: "विशेषज्ञ",
  bullet: "बुलेट",
  blitz: "ब्लिट्ज",
  rapid: "रैपिड",
  classical: "क्लासिकल",
  findMatch: "मैच खोजें",
  createRoom: "रूम बनाएँ",
  joinRoom: "रूम में जुड़ें",
  inviteFriend: "दोस्त को बुलाएँ",
  guest: "गेस्ट के रूप में खेलें",
  login: "लॉगिन",
  signup: "साइन अप",
  logout: "लॉगआउट",
  email: "ईमेल",
  password: "पासवर्ड",
  displayName: "नाम",
  playerId: "प्लेयर आईडी",
  aboutDeveloper: "संस्थापक और डेवलपर",
  privacy: "प्राइवेसी",
  terms: "नियम और शर्तें",
  exit: "बाहर जाएँ"
};

const CORE_TRANSLATIONS = {
  zh: {
    home: "首页", play: "开始游戏", offline: "离线", online: "在线",
    training: "训练", puzzles: "谜题", tournaments: "锦标赛",
    shop: "商店与主题", leaderboard: "排行榜", profile: "个人资料",
    settings: "设置", about: "关于", back: "返回", close: "关闭",
    coins: "金币", diamonds: "钻石", loading: "加载中...",
    confirm: "确认", cancel: "取消", login: "登录", logout: "退出登录"
  },
  ja: {
    home: "ホーム", play: "プレイ", offline: "オフライン", online: "オンライン",
    training: "トレーニング", puzzles: "パズル", tournaments: "トーナメント",
    shop: "ショップとテーマ", leaderboard: "ランキング", profile: "プロフィール",
    settings: "設定", about: "アプリについて", back: "戻る", close: "閉じる",
    coins: "コイン", diamonds: "ダイヤモンド", loading: "読み込み中...",
    confirm: "確認", cancel: "キャンセル", login: "ログイン", logout: "ログアウト"
  },
  ko: {
    home: "홈", play: "플레이", offline: "오프라인", online: "온라인",
    training: "훈련", puzzles: "퍼즐", tournaments: "토너먼트",
    shop: "상점 및 테마", leaderboard: "순위표", profile: "프로필",
    settings: "설정", about: "정보", back: "뒤로", close: "닫기",
    coins: "코인", diamonds: "다이아몬드", loading: "로딩 중...",
    confirm: "확인", cancel: "취소", login: "로그인", logout: "로그아웃"
  },
  fr: {
    home: "Accueil", play: "Jouer", offline: "Hors ligne", online: "En ligne",
    training: "Entraînement", puzzles: "Énigmes", tournaments: "Tournois",
    shop: "Boutique et thèmes", leaderboard: "Classement", profile: "Profil",
    settings: "Paramètres", about: "À propos", back: "Retour", close: "Fermer",
    coins: "Pièces", diamonds: "Diamants", loading: "Chargement...",
    confirm: "Confirmer", cancel: "Annuler", login: "Connexion", logout: "Déconnexion"
  },
  de: {
    home: "Startseite", play: "Spielen", offline: "Offline", online: "Online",
    training: "Training", puzzles: "Rätsel", tournaments: "Turniere",
    shop: "Shop und Designs", leaderboard: "Bestenliste", profile: "Profil",
    settings: "Einstellungen", about: "Über", back: "Zurück", close: "Schließen",
    coins: "Münzen", diamonds: "Diamanten", loading: "Lädt...",
    confirm: "Bestätigen", cancel: "Abbrechen", login: "Anmelden", logout: "Abmelden"
  },
  ru: {
    home: "Главная", play: "Играть", offline: "Офлайн", online: "Онлайн",
    training: "Тренировка", puzzles: "Задачи", tournaments: "Турниры",
    shop: "Магазин и темы", leaderboard: "Таблица лидеров", profile: "Профиль",
    settings: "Настройки", about: "О приложении", back: "Назад", close: "Закрыть",
    coins: "Монеты", diamonds: "Алмазы", loading: "Загрузка...",
    confirm: "Подтвердить", cancel: "Отмена", login: "Войти", logout: "Выйти"
  },
  uk: {
    home: "Головна", play: "Грати", offline: "Офлайн", online: "Онлайн",
    training: "Тренування", puzzles: "Задачі", tournaments: "Турніри",
    shop: "Магазин і теми", leaderboard: "Рейтинг", profile: "Профіль",
    settings: "Налаштування", about: "Про застосунок", back: "Назад", close: "Закрити",
    coins: "Монети", diamonds: "Діаманти", loading: "Завантаження...",
    confirm: "Підтвердити", cancel: "Скасувати", login: "Увійти", logout: "Вийти"
  },
  bn: {
    home: "হোম", play: "খেলুন", offline: "অফলাইন", online: "অনলাইন",
    training: "প্রশিক্ষণ", puzzles: "ধাঁধা", tournaments: "টুর্নামেন্ট",
    shop: "দোকান ও থিম", leaderboard: "লিডারবোর্ড", profile: "প্রোফাইল",
    settings: "সেটিংস", about: "সম্পর্কে", back: "ফিরে যান", close: "বন্ধ করুন",
    coins: "কয়েন", diamonds: "হীরা", loading: "লোড হচ্ছে...",
    confirm: "নিশ্চিত করুন", cancel: "বাতিল", login: "লগইন", logout: "লগআউট"
  },
  ta: {
    home: "முகப்பு", play: "விளையாடு", offline: "ஆஃப்லைன்", online: "ஆன்லைன்",
    training: "பயிற்சி", puzzles: "புதிர்கள்", tournaments: "போட்டிகள்",
    shop: "கடை மற்றும் தீம்கள்", leaderboard: "தரவரிசை", profile: "சுயவிவரம்",
    settings: "அமைப்புகள்", about: "பற்றி", back: "பின்", close: "மூடு",
    coins: "நாணயங்கள்", diamonds: "வைரங்கள்", loading: "ஏற்றப்படுகிறது...",
    confirm: "உறுதிப்படுத்து", cancel: "ரத்து", login: "உள்நுழை", logout: "வெளியேறு"
  },
  te: {
    home: "హోమ్", play: "ఆడండి", offline: "ఆఫ్‌లైన్", online: "ఆన్‌లైన్",
    training: "శిక్షణ", puzzles: "పజిల్స్", tournaments: "టోర్నమెంట్లు",
    shop: "షాప్ మరియు థీమ్స్", leaderboard: "ర్యాంకింగ్స్", profile: "ప్రొఫైల్",
    settings: "సెట్టింగ్స్", about: "గురించి", back: "వెనుకకు", close: "మూసివేయి",
    coins: "నాణేలు", diamonds: "వజ్రాలు", loading: "లోడ్ అవుతోంది...",
    confirm: "నిర్ధారించండి", cancel: "రద్దు", login: "లాగిన్", logout: "లాగౌట్"
  },
  mr: {
    home: "मुख्यपृष्ठ", play: "खेळा", offline: "ऑफलाइन", online: "ऑनलाइन",
    training: "प्रशिक्षण", puzzles: "कोडी", tournaments: "स्पर्धा",
    shop: "दुकान आणि थीम", leaderboard: "क्रमवारी", profile: "प्रोफाइल",
    settings: "सेटिंग्ज", about: "माहिती", back: "मागे", close: "बंद करा",
    coins: "नाणी", diamonds: "हिर्‍य", loading: "लोड होत आहे...",
    confirm: "निश्चित करा", cancel: "रद्द करा", login: "लॉगिन", logout: "लॉगआउट"
  },
  gu: {
    home: "હોમ", play: "રમો", offline: "ઓફલાઇન", online: "ઓનલાઇન",
    training: "તાલીમ", puzzles: "કોયડા", tournaments: "ટુર્નામેન્ટ",
    shop: "દુકાન અને થીમ", leaderboard: "રેન્કિંગ", profile: "પ્રોફાઇલ",
    settings: "સેટિંગ્સ", about: "વિશે", back: "પાછા", close: "બંધ કરો",
    coins: "સિક્કા", diamonds: "હીરા", loading: "લોડ થઈ રહ્યું છે...",
    confirm: "પુષ્ટિ કરો", cancel: "રદ કરો", login: "લોગિન", logout: "લોગઆઉટ"
  },
  pa: {
    home: "ਮੁੱਖ ਪੰਨਾ", play: "ਖੇਡੋ", offline: "ਆਫਲਾਈਨ", online: "ਆਨਲਾਈਨ",
    training: "ਸਿਖਲਾਈ", puzzles: "ਪਹੇਲੀਆਂ", tournaments: "ਟੂਰਨਾਮੈਂਟ",
    shop: "ਦੁਕਾਨ ਅਤੇ ਥੀਮ", leaderboard: "ਦਰਜਾਬੰਦੀ", profile: "ਪ੍ਰੋਫਾਈਲ",
    settings: "ਸੈਟਿੰਗਾਂ", about: "ਬਾਰੇ", back: "ਵਾਪਸ", close: "ਬੰਦ ਕਰੋ",
    coins: "ਸਿੱਕੇ", diamonds: "ਹੀਰੇ", loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    confirm: "ਪੁਸ਼ਟੀ ਕਰੋ", cancel: "ਰੱਦ ਕਰੋ", login: "ਲਾਗਇਨ", logout: "ਲਾਗਆਉਟ"
  },
  kn: {
    home: "ಮುಖಪುಟ", play: "ಆಡಿ", offline: "ಆಫ್‌ಲೈನ್", online: "ಆನ್‌ಲೈನ್",
    training: "ತರಬೇತಿ", puzzles: "ಒಗಟುಗಳು", tournaments: "ಪಂದ್ಯಾವಳಿಗಳು",
    shop: "ಅಂಗಡಿ ಮತ್ತು ಥೀಮ್‌ಗಳು", leaderboard: "ಶ್ರೇಯಾಂಕ", profile: "ಪ್ರೊಫೈಲ್",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", about: "ಬಗ್ಗೆ", back: "ಹಿಂದೆ", close: "ಮುಚ್ಚಿ",
    coins: "ನಾಣ್ಯಗಳು", diamonds: "ವಜ್ರಗಳು", loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    confirm: "ದೃಢೀಕರಿಸಿ", cancel: "ರದ್ದುಮಾಡಿ", login: "ಲಾಗಿನ್", logout: "ಲಾಗ್‌ಔಟ್"
  },
  ml: {
    home: "ഹോം", play: "കളിക്കുക", offline: "ഓഫ്‌ലൈൻ", online: "ഓൺലൈൻ",
    training: "പരിശീലനം", puzzles: "പസിലുകൾ", tournaments: "ടൂർണമെന്റുകൾ",
    shop: "ഷോപ്പും തീമുകളും", leaderboard: "റാങ്കിംഗ്", profile: "പ്രൊഫൈൽ",
    settings: "ക്രമീകരണങ്ങൾ", about: "വിവരം", back: "തിരികെ", close: "അടയ്ക്കുക",
    coins: "നാണയങ്ങൾ", diamonds: "വജ്രങ്ങൾ", loading: "ലോഡ് ചെയ്യുന്നു...",
    confirm: "സ്ഥിരീകരിക്കുക", cancel: "റദ്ദാക്കുക", login: "ലോഗിൻ", logout: "ലോഗൗട്ട്"
  },
  or: {
    home: "ମୁଖ୍ୟ ପୃଷ୍ଠା", play: "ଖେଳନ୍ତୁ", offline: "ଅଫଲାଇନ୍", online: "ଅନଲାଇନ୍",
    training: "ପ୍ରଶିକ୍ଷଣ", puzzles: "ପଜଲ୍", tournaments: "ଟୁର୍ଣ୍ଣାମେଣ୍ଟ",
    shop: "ଦୋକାନ ଏବଂ ଥିମ୍", leaderboard: "ରାଙ୍କିଂ", profile: "ପ୍ରୋଫାଇଲ୍",
    settings: "ସେଟିଂସ୍", about: "ବିଷୟରେ", back: "ପଛକୁ", close: "ବନ୍ଦ କରନ୍ତୁ",
    coins: "ମୁଦ୍ରା", diamonds: "ହୀରା", loading: "ଲୋଡ୍ ହେଉଛି...",
    confirm: "ନିଶ୍ଚିତ କରନ୍ତୁ", cancel: "ବାତିଲ୍", login: "ଲଗଇନ୍", logout: "ଲଗଆଉଟ୍"
  }
};

export const TRANSLATIONS = {
  en: ENGLISH,
  hi: HINDI,
  ...CORE_TRANSLATIONS
};

/**
 * Returns translated text for a language and key.
 * Missing translations fall back to English.
 */
export function getTranslation(language, key) {
  const selectedLanguage = TRANSLATIONS[language]
    ? language
    : DEFAULT_LANGUAGE;

  return (
    TRANSLATIONS[selectedLanguage]?.[key] ??
    ENGLISH[key] ??
    key
  );
}

/**
 * Returns language information by its code.
 */
export function getLanguageInfo(languageCode) {
  return (
    LANGUAGE_LIST.find(item => item.code === languageCode) ??
    LANGUAGE_LIST.find(item => item.code === DEFAULT_LANGUAGE)
  );
}

/**
 * Checks whether a language is supported.
 */
export function isLanguageSupported(languageCode) {
  return LANGUAGE_LIST.some(item => item.code === languageCode);
}

/**
 * Returns all available languages.
 */
export function getAvailableLanguages() {
  return LANGUAGE_LIST.map(language => ({ ...language }));
}

/* =========================================================
   FILE END: config/language-data.js
   ========================================================= */
  
