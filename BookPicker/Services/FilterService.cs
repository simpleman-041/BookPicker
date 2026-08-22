using BookPicker.Models;

namespace BookPicker.Services
{
    /// <summary>
    /// 受け取った本のリストとフィルタリング条件に基づいて、本のリストをフィルタリングするサービスクラス。
    /// </summary>
    public class FilterService
    {
        public IEnumerable<Book> FilterBooks(IEnumerable<Book> books, FilterCriteria criteria)
        {
            var filteredBooks = books;
            if (criteria.IsCompleted.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.IsCompleted == criteria.IsCompleted.Value);
            }
            if (criteria.Genre.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.Genre == criteria.Genre.Value);
            }
            if (criteria.MinPages.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.TotalPages >= criteria.MinPages.Value);
            }
            if (criteria.MaxPages.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.TotalPages <= criteria.MaxPages.Value);
            }
            if (criteria.ReadingStatus.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.ReadingStatus == criteria.ReadingStatus.Value);
            }
            if (criteria.InterestLevel.HasValue)
            {
                filteredBooks = filteredBooks.Where(b => b.InterestLevel >= criteria.InterestLevel.Value);
            }
            if (!string.IsNullOrEmpty(criteria.SearchTitle))
            {
                // 完全一致か部分一致かの条件によってフィルタリングを分岐する
                if (criteria.TitleMatchMode == TitleMatchMode.Exact)
                {
                    filteredBooks = filteredBooks.Where(b => b.Title.Equals(criteria.SearchTitle, StringComparison.OrdinalIgnoreCase));
                }
                else if (criteria.TitleMatchMode == TitleMatchMode.Partial)
                {
                    filteredBooks = filteredBooks.Where(b => b.Title.Contains(criteria.SearchTitle, StringComparison.OrdinalIgnoreCase));
                }
            }
            return filteredBooks;
        }
    }
}
