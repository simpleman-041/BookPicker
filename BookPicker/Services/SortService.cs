using BookPicker.Models;

namespace BookPicker.Services
{
    /// <summary>
    /// 本の一覧と並び替え条件を受取り、条件に従って並び替えた本の一覧を返す。
    /// </summary>
    public class SortService 
    {
        public IEnumerable<Book> SortBooks(IEnumerable<Book> books, SortCriteria criteria)
        {
            var sortedBooks = books;

            // 並び替え基準で分岐したのち、昇順、降順の指定に基づいて並び替えを行う。
            // 最終防衛線として、想定外の値が指定された場合はInvalidOperationExceptionをスローする。   
            if (criteria.Field == SortField.Title)
            {
                sortedBooks = criteria.Order switch
                {
                    SortOrder.Ascending => sortedBooks.OrderBy(b => b.Title),
                    SortOrder.Descending => sortedBooks.OrderByDescending(b => b.Title),
                    _ => throw new InvalidOperationException("並び替え順序に不正な値が指定されました。")
                };
            }
            else if (criteria.Field == SortField.TotalPages)
            {
                sortedBooks = criteria.Order switch
                {
                    SortOrder.Ascending => sortedBooks.OrderBy(b => b.TotalPages),
                    SortOrder.Descending => sortedBooks.OrderByDescending(b => b.TotalPages),
                    _ => throw new InvalidOperationException("並び替え順序に不正な値が指定されました。")
                };
            }
            else if (criteria.Field == SortField.InterestLevel)
            {
                sortedBooks = criteria.Order switch
                {
                    SortOrder.Ascending => sortedBooks.OrderBy(b => b.InterestLevel),
                    SortOrder.Descending => sortedBooks.OrderByDescending(b => b.InterestLevel),
                    _ => throw new InvalidOperationException("並び替え順序に不正な値が指定されました。")
                };
            }
            else if (criteria.Field == SortField.ReadingStatus)
            {
                sortedBooks = criteria.Order switch
                {
                    SortOrder.Ascending => sortedBooks.OrderBy(b => b.ReadingStatus),
                    SortOrder.Descending => sortedBooks.OrderByDescending(b => b.ReadingStatus),
                    _ => throw new InvalidOperationException("並び替え順序に不正な値が指定されました。")    
                };
            }
            else
            {
                throw new InvalidOperationException("並び替え基準に不正な値が指定されました。");
            }

            return sortedBooks;
        }
    }
}
