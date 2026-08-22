namespace BookPicker.Models
{
    /// <summary>
    /// タイトル検索において、完全一致か部分一致かを選択できるようにするためのenum
    /// </summary>
    public enum TitleMatchMode
    {
        Exact = 0, Partial = 1
    }
    /// <summary>
    /// 本のフィルタリング条件を表すクラス。
    /// </summary>
    public class FilterCriteria
    {
        public bool?           IsCompleted    { get; private set; } = null;
        public Genre?          Genre          { get; private set; } = null;
        public int?            MinPages       { get; private set; } = null;
        public int?            MaxPages       { get; private set; } = null;
        public ReadingStatus?  ReadingStatus  { get; private set; } = null;
        public InterestLevel?  InterestLevel  { get; private set; } = null;
        public string?         SearchTitle    { get; private set; } = null;
        public TitleMatchMode? TitleMatchMode { get; private set; } = null;

        public FilterCriteria(
            bool?           isCompleted,   
            Genre?          genre,        
            int?            minPages,     
            int?            maxPages,     
            ReadingStatus?  readingStatus,
            InterestLevel?  interestLevel,
            string?         searchTitle,
            TitleMatchMode? titleMatchMode)
        {
            // TODO: 現在はthrowで弾くようにしているが、boolやResultを返すようにして、エラー内容を返すようにすることも検討する。
            // IsCompleted以外の全てのプロパティにおいて無効な値、矛盾している値を弾く。
            // また、タイトルとタイトル検索条件は片方が入力された場合、もう片方も入力されている必要がある。片方のみの入力は弾く。
            if (searchTitle != null && searchTitle.Trim() == "")
            {
                throw new ArgumentException("検索するタイトル名が空になっています。", nameof(searchTitle));
            }
            if (searchTitle != null && searchTitle.Length > 100)
            {
                throw new ArgumentOutOfRangeException(nameof(searchTitle), "タイトルは100文字以内で入力する必要があります。");
            }

            if (minPages <= 0 && minPages != null)
            {
                throw new ArgumentOutOfRangeException(nameof(minPages), "ページ数下限には1以上の値を入力してください。");
            }
            if (maxPages <= 0 && maxPages != null)
            {
                throw new ArgumentOutOfRangeException(nameof(maxPages), "ページ数上限には1以上の値を入力してください。"); 
            }

            if (minPages > 10000 && minPages != null)
            {
                throw new ArgumentOutOfRangeException(nameof(minPages), "ページ数下限に極端に大きな値を代入することはできません");
            }
            if (maxPages > 10000 && maxPages != null)
            {
                throw new ArgumentOutOfRangeException(nameof(maxPages), "ページ数上限に極端に大きな値を代入することはできません");
            }

            if (minPages > maxPages && (maxPages != null && minPages!= null))
            {
                throw new ArgumentOutOfRangeException(nameof(minPages), "最小ページ数の条件が最大ページ数より大きいです。");
            }

            if (genre != null && !Enum.IsDefined(typeof(Genre), genre))
            {
                throw new ArgumentException(nameof(genre), "ジャンルに不正な値が指定されました。");
            }

            if (readingStatus != null && !Enum.IsDefined(typeof(ReadingStatus), readingStatus))
            {
                throw new ArgumentException(nameof(readingStatus), "読書進捗に不正な値が指定されました。");
            }

            if (interestLevel != null && !Enum.IsDefined(typeof(InterestLevel), interestLevel))
            {
                throw new ArgumentException(nameof(interestLevel), "興味レベルに不正な値が指定されました。");
            }

            if (titleMatchMode != null && !Enum.IsDefined(typeof(TitleMatchMode), titleMatchMode))
            {
                throw new ArgumentException(nameof(titleMatchMode), "タイトル検索条件に不正な値が指定されました。");
            }

            if (searchTitle == null && titleMatchMode != null)
            {
                throw new ArgumentException(nameof(searchTitle), "タイトルが入力されていないため、一致検索モードを有効化出来ません。");
            }
            if (searchTitle != null && titleMatchMode == null)
            {
                throw new ArgumentException(nameof(titleMatchMode), "タイトルが入力されているため、一致検索モードを有効化する必要があります。");
            }

            IsCompleted   = isCompleted;
            Genre         = genre;
            MinPages      = minPages;
            MaxPages      = maxPages;
            ReadingStatus = readingStatus;
            InterestLevel = interestLevel;
            SearchTitle   = searchTitle;
            TitleMatchMode = titleMatchMode;
        }

    }
}
