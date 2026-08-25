using BookPicker.Models;

namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPリクエストで本の一般編集可能な項目を更新するためのデータを表すクラス。
    /// </summary>
    public class UpdateBookRequest
    {
        public string Title                { get; set; } = string.Empty;
        public Genre Genre                 { get; set; }
        public int TotalPages              { get; set; }
        public int CurrentPage             { get; set; }
        public InterestLevel InterestLevel { get; set; }
        public string? CoverImagePath       { get; set; }
    }
}
