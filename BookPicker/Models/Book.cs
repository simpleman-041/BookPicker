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

        public Book(string title, Genre genre, int totalPages, InterestLevel interestLevel)
        {
            // TODO: 現在はthrowで弾くようにしているが、boolやResultを返すようにして、エラー内容を返すようにすることも検討する。
            // 空、null、空白文字列のタイトルは許容しない。また、タイトルの長さは100文字以内に制限する。
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException(nameof(title), "タイトルは空白にできません。");
            }
            if (title.Length > 100)
            {
                throw new ArgumentException(nameof(title), "タイトルは100文字以内で入力してください。");
            }

            // 列挙型はnullを許容しないため、nullチェックは不要。ただし、定義されていない値を防ぐ必要がある。
            if (!Enum.IsDefined(typeof(Genre), genre))
            {
                throw new ArgumentException(nameof(genre), "ジャンルに不正な値が指定されました。");
            }

            // 総ページ数は1以上10000以下の値を許容する。0以下や10000を超える値は不正とする。
            if (totalPages <= 0)
            {
                throw new ArgumentException(nameof(totalPages), "総ページ数は1以上の値を入力してください。");
            }
            if (totalPages > 10000)
            {
                throw new ArgumentException(nameof(totalPages), "総ページ数は10000以下の値を入力してください。");
            }

            // これも列挙型なのでnullチェックは不要。ただし、定義されていない値を防ぐ必要がある。
            if (!Enum.IsDefined(typeof(InterestLevel), interestLevel))
            {
                throw new ArgumentException(nameof(interestLevel), "興味レベルに不正な値が指定されました。");
            }
            Title = title;
            Genre         = genre;
            TotalPages    = totalPages;
            InterestLevel = interestLevel;
        }

        /// <summary>
        /// ユーザの入力に応じてCurrentPageとReadingStatusを更新するメソッド。
        /// </summary>
        public void UpdateCurrentPageAndReadingStatus(int currentPage)
        {
            // TODO: 現在はthrowで弾くようにしているが、boolやResultを返すようにして、エラー内容を返すようにすることも検討する。
            // IsCompletedの更新はここでは行わない。UI側でユーザーの入力に応じてSetIsCompletedメソッドを呼び出すことで更新するからだ。
            if (currentPage < 0)
            {
                throw new ArgumentException(nameof(currentPage), "現在ページ数は0以上の値を入力してください。");
            }
            else if (currentPage > TotalPages)
            {
                throw new ArgumentException(nameof(currentPage), "現在ページ数は総ページ数を超えることはできません。"    );
            }

            CurrentPage = currentPage;
            UpdateReadingStatus();
            
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
