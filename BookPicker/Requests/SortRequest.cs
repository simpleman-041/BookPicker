using BookPicker.Models;

namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPからソート条件を受け取る為のデータを表すクラス
    /// </summary>
    public class SortRequest
    {
        public SortField? Field { get; set; } = null;
        public SortOrder? Order { get; set; } = null;
        public bool IsValid => Field.HasValue == Order.HasValue;
    }
}
