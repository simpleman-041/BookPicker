namespace BookPicker.Models
{
    /// <summary>
    /// 本の並び替え基準を表す列挙型。
    /// </summary>
    public enum SortField
    {
        Title = 0,
        TotalPages = 1,
        InterestLevel = 2,
        ReadingStatus = 3
    }
    /// <summary>
    /// 本の並び替えにおいて昇順か降順かを表す列挙型。
    /// </summary>
    public enum SortOrder
    {
        Ascending = 0,
        Descending = 1
    }

    /// <summary>
    /// 本の並び替え基準と順序を表すクラス。
    /// これをサービスに渡すことで、指定された基準と順序で本のリストを並び替えることができる設計にする。
    /// </summary>
    public class SortCriteria
    {
        // 並び替え基準が指定されている場合は、昇順か降順かを指定する必要がある。
        public SortField Field { get; private set; }
        public SortOrder Order { get; private set; }

        public SortCriteria(SortField field, SortOrder order)
        {
            if (!Enum.IsDefined(typeof(SortField), field))
            {
                throw new ArgumentException("並び替え基準に不正な値が指定されました。", nameof(field));
            }
            if (!Enum.IsDefined(typeof(SortOrder), order))
            {
                throw new ArgumentException("並び替え順序に不正な値が指定されました。", nameof(order));
            }

            Field = field;
            Order = order;
        }
    }
}
