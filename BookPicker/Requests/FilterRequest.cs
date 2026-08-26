using BookPicker.Models;

namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPからフィルタリング条件を受け取る為のデータを表すクラス
    /// </summary>
    public class FilterRequest
    {
        public bool?           IsCompleted    { get; set; } = null;
        public bool?           IsFavorite     { get; set; } = null;
        public Genre?          Genre          { get; set; } = null;
        public int?            MinPages       { get; set; } = null;
        public int?            MaxPages       { get; set; } = null;
        public ReadingStatus?  ReadingStatus  { get; set; } = null;
        public InterestLevel?  InterestLevel  { get; set; } = null;
        public string?         SearchTitle    { get; set; } = null;
        public TitleMatchMode? TitleMatchMode { get; set; } = null;
    }
}
