using BookPicker.Models;

namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPリクエストで本を作成するためのデータを表すクラス。
    /// </summary>
    public class CreateBookRequest
    {
        public string Title                { get; set; }
        public Genre Genre                 { get; set; }
        public int TotalPages              { get; set; }
        public InterestLevel InterestLevel { get; set; }
    }
}
