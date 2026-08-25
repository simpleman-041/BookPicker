namespace BookPicker.Models
{
    /// <summary>
    /// 1冊の本を表すデータモデル。
    /// </summary>
    public class Book
    {
        public int           Id            { get; private set; }
        public string        Title         { get; private set; }
        public Genre         Genre         { get; private set; }
        public int           TotalPages    { get; private set; } = 0;
        public int           CurrentPage   { get; private set; } = 0;
        /// <summary>
        /// この本に対する興味レベルの5段階評価。なし、少し、あり、とても、最優先
        /// </summary>
        public InterestLevel InterestLevel { get; private set; } = InterestLevel.NotInterested;
        /// <summary>
        /// 読了フラグ。trueの場合は読了、falseの場合は未読了
        /// </summary>
        public bool          IsCompleted   { get; private set; } = false;
        /// <summary>
        /// 読書の進捗を5段階で表す。手つかず、序盤、中盤、終盤、完了
        /// </summary>
        public ReadingStatus ReadingStatus { get; private set; } = ReadingStatus.NotStarted;
        /// <summary>
        /// 最後に実際に読み進めたUTC日時。
        /// </summary>
        public DateTime?     LastReadAt     { get; private set; }
        /// <summary>
        /// 表紙画像のアプリ内相対パスまたはURL。
        /// </summary>
        public string?       CoverImagePath { get; private set; }

        public Book(
            string title,
            Genre genre,
            int totalPages,
            InterestLevel interestLevel,
            string? coverImagePath = null)
        {
            ValidateTitle(title);
            ValidateGenre(genre);
            ValidateTotalPages(totalPages);
            ValidateInterestLevel(interestLevel);

            Title          = title;
            Genre          = genre;
            TotalPages     = totalPages;
            InterestLevel  = interestLevel;
            CoverImagePath = NormalizeCoverImagePath(coverImagePath);
        }

        /// <summary>
        /// ユーザの入力に応じてCurrentPageとReadingStatusを更新するメソッド。
        /// </summary>
        public void UpdateCurrentPageAndReadingStatus(int currentPage)
        {
            ValidateCurrentPage(currentPage, TotalPages);

            var previousCurrentPage = CurrentPage;
            CurrentPage = currentPage;
            UpdateLastReadAtIfProgressed(previousCurrentPage);
            UpdateReadingStatus();
        }

        /// <summary>
        /// 編集可能な項目の最終状態を検証し、有効な場合だけまとめて更新する。
        /// </summary>
        public void UpdateDetails(
            string title,
            Genre genre,
            int totalPages,
            int currentPage,
            InterestLevel interestLevel,
            string? coverImagePath)
        {
            ValidateTitle(title);
            ValidateGenre(genre);
            ValidateTotalPages(totalPages);
            ValidateCurrentPage(currentPage, totalPages);
            ValidateInterestLevel(interestLevel);

            var normalizedCoverImagePath = NormalizeCoverImagePath(coverImagePath);
            var previousCurrentPage = CurrentPage;

            Title          = title;
            Genre          = genre;
            TotalPages     = totalPages;
            CurrentPage    = currentPage;
            InterestLevel  = interestLevel;
            CoverImagePath = normalizedCoverImagePath;

            if (CurrentPage < TotalPages)
            {
                IsCompleted = false;
            }

            UpdateLastReadAtIfProgressed(previousCurrentPage);
            UpdateReadingStatus();
        }

        private void UpdateLastReadAtIfProgressed(int previousCurrentPage)
        {
            if (CurrentPage > previousCurrentPage)
            {
                LastReadAt = DateTime.UtcNow;
            }
        }

        private static string? NormalizeCoverImagePath(string? coverImagePath)
        {
            return string.IsNullOrWhiteSpace(coverImagePath) ? null : coverImagePath;
        }

        private static void ValidateTitle(string title)
        {
            // 空、null、空白文字列のタイトルは許容しない。また、タイトルの長さは100文字以内に制限する。
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException("タイトルは空白にできません。", nameof(title));
            }
            if (title.Length > 100)
            {
                throw new ArgumentException("タイトルは100文字以内で入力してください。", nameof(title));
            }
        }

        private static void ValidateGenre(Genre genre)
        {
            if (!Enum.IsDefined(typeof(Genre), genre))
            {
                throw new ArgumentException("ジャンルに不正な値が指定されました。", nameof(genre));
            }
        }

        private static void ValidateTotalPages(int totalPages)
        {
            // 総ページ数は1以上10000以下の値を許容する。0以下や10000を超える値は不正とする。
            if (totalPages <= 0)
            {
                throw new ArgumentException("総ページ数は1以上の値を入力してください。", nameof(totalPages));
            }
            if (totalPages > 10000)
            {
                throw new ArgumentException("総ページ数は10000以下の値を入力してください。", nameof(totalPages));
            }
        }

        private static void ValidateCurrentPage(int currentPage, int totalPages)
        {
            if (currentPage < 0)
            {
                throw new ArgumentException("現在ページ数は0以上の値を入力してください。", nameof(currentPage));
            }
            if (currentPage > totalPages)
            {
                throw new ArgumentException("現在ページ数は総ページ数を超えることはできません。", nameof(currentPage));
            }
        }

        private static void ValidateInterestLevel(InterestLevel interestLevel)
        {
            if (!Enum.IsDefined(typeof(InterestLevel), interestLevel))
            {
                throw new ArgumentException("興味レベルに不正な値が指定されました。", nameof(interestLevel));
            }
        }
        /// <summary>
        /// CurrentPage更新時に呼ばれる読書進捗更新メソッド。総ページ数に対する現在ページの割合を計算し、5段階ある読書進捗を更新。
        /// 手つかず、序盤、中盤、終盤、完了の5段階で表す。
        /// </summary>
        private void UpdateReadingStatus()
        {
            double readProgressRatio = (double)CurrentPage / TotalPages;
            
            switch (readProgressRatio)
            {
                case >= 1.0:
                    if (IsCompleted)
                    {
                        ReadingStatus = ReadingStatus.Completed;
                    }
                    else
                    {
                        ReadingStatus = ReadingStatus.LateStage;
                    }
                    break;
                case >= 0.66:
                    ReadingStatus = ReadingStatus.LateStage;
                    IsCompleted = false;
                    break;
                case >= 0.33:
                    ReadingStatus = ReadingStatus.MidWay;
                    IsCompleted = false;
                    break;
                case > 0.0:
                    ReadingStatus = ReadingStatus.EarlyStage;
                    IsCompleted = false;
                    break;
                case 0.0:
                    ReadingStatus = ReadingStatus.NotStarted;
                    IsCompleted = false;
                    break;
            }
        }

        /// <summary>
        /// 読了フラグを更新するメソッド。ユーザーの入力に応じてIsCompletedを更新する。
        /// UI側でユーザーの入力に応じて呼び出されることを想定している。
        /// </summary>
        /// <param name="isFinishReading"></param>
        public void SetIsCompleted(bool isFinishReading)
        {
            if (CurrentPage == TotalPages)
            {
                IsCompleted = isFinishReading;
                UpdateReadingStatus();
            }
        }
    }
}
