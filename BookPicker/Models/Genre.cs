namespace BookPicker.Models
{
    /// <summary>
    /// 本のジャンルを表す列挙型
    /// </summary>
    public enum Genre
    {
        /// <summary>未指定・不明</summary>
        None = 0,

        // --- 文芸・フィクション ---
        /// <summary>小説・文学全般</summary>
        Fiction,
        /// <summary>ミステリー・推理</summary>
        Mystery,
        /// <summary>SF（サイエンス・フィクション）</summary>
        SciFi,
        /// <summary>ファンタジー</summary>
        Fantasy,
        /// <summary>恋愛・ロマンス</summary>
        Romance,
        /// <summary>ホラー・怪談</summary>
        Horror,
        /// <summary>歴史・時代小説</summary>
        HistoricalFiction,

        // --- 実用・ビジネス・専門書 ---
        /// <summary>ビジネス・経済</summary>
        Business,
        /// <summary>自己啓発</summary>
        SelfHelp,
        /// <summary>IT・技術書</summary>
        Technology,
        /// <summary>人文・思想・哲学</summary>
        Humanities,
        /// <summary>歴史・地理（ノンフィクション）</summary>
        History,
        /// <summary>科学・数学</summary>
        Science,
        /// <summary>医学・健康</summary>
        Health,
        /// <summary>語学・資格</summary>
        Education,

        // --- 趣味・生活 ---
        /// <summary>料理・レシピ</summary>
        Cooking,
        /// <summary>芸術・アート・デザイン</summary>
        Art,
        /// <summary>旅行・ガイドブック</summary>
        Travel,
        /// <summary>趣味・実用</summary>
        Hobby,

        // --- エンタメ・その他 ---
        /// <summary>マンガ・コミック</summary>
        Manga,
        /// <summary>雑誌</summary>
        Magazine,
        /// <summary>絵本・児童書</summary>
        ChildrensBook,
        /// <summary>ライトノベル</summary>
        LightNovel,

        /// <summary>その他</summary>
        Other = 99
    }
}
