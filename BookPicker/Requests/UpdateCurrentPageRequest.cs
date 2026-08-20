namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPから更新後のページ番号を受け取る為のデータを表すクラス
    /// </summary>
    public class UpdateCurrentPageRequest
    {
        public int CurrentPage { get; set; }
    }
}
