using BookPicker.Data;
using BookPicker.Models;
using BookPicker.Requests;
using BookPicker.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookPicker.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BooksController : ControllerBase
    {
        // コンストラクタで受け取った BookPickerDbContext をプライベートフィールドに格納しておく
        private readonly BookPickerDbContext _dbContext;

        public BooksController(BookPickerDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBook(int id)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            return Ok(book);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBook(int id)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            _dbContext.Books.Remove(book);
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost]
        public async Task<IActionResult> CreateBook(CreateBookRequest createBookRequest)
        {
            try
            {
                var book = new Book(
                    createBookRequest.Title,
                    createBookRequest.Genre,
                    createBookRequest.TotalPages,
                    createBookRequest.InterestLevel,
                    createBookRequest.CoverImagePath
                    );
                _dbContext.Books.Add(book);
                await _dbContext.SaveChangesAsync();
                return CreatedAtAction(nameof(GetBook), new { id = book.Id }, book);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            
            
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBook(int id, UpdateBookRequest updateBookRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }

            try
            {
                book.UpdateDetails(
                    updateBookRequest.Title,
                    updateBookRequest.Genre,
                    updateBookRequest.TotalPages,
                    updateBookRequest.CurrentPage,
                    updateBookRequest.InterestLevel,
                    updateBookRequest.CoverImagePath);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/completion")]
        public async Task<IActionResult> UpdateCompletion(int id, UpdateCompletionRequest updateCompletionRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }

            if (!book.TrySetIsCompleted(updateCompletionRequest.IsCompleted))
            {
                return BadRequest("最終ページへ到達していない本を読了にすることはできません。");
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/progress")]
        public async Task<IActionResult> UpdateCurrentPage(int id, UpdateCurrentPageRequest updateCurrentPageRequest)
        {
            var book = await _dbContext.Books.FindAsync(id);
            if (book == null)
            {
                return NotFound();
            }
            
            // 現在ページが総ページを超える、負の値といった矛盾したケースを想定
            try
            {
                book.UpdateCurrentPageAndReadingStatus(updateCurrentPageRequest.CurrentPage);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// リクエストされたフィルター条件、並び替え条件をもとに、書籍のリストを取得する。
        /// </summary>
        /// <param name="filterRequest">フィルター条件をまとめたオブジェクト</param>
        /// <param name="sortRequest">並び替え条件をまとめたオブジェクト</param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> FilterAndSort([FromQuery] FilterRequest filterRequest, [FromQuery] SortRequest sortRequest)
        {
            // 並び替え条件が無効な場合は DBアクセスを行わずに BadRequest を返す
            if (sortRequest.IsValid == false) return BadRequest("Invalid sort request.");

            try
            {
                var filterCriteria = new FilterCriteria(
                    filterRequest.IsCompleted,
                    filterRequest.Genre,
                    filterRequest.MinPages,
                    filterRequest.MaxPages,
                    filterRequest.ReadingStatus,
                    filterRequest.InterestLevel,
                    filterRequest.SearchTitle,
                    filterRequest.TitleMatchMode
                );

                SortCriteria? sortCriteria = null;
                if (sortRequest.Field.HasValue && sortRequest.Order.HasValue)
                {
                    sortCriteria = new SortCriteria(sortRequest.Field.Value, sortRequest.Order.Value);
                }

                var books = await _dbContext.Books.ToListAsync();
                var filterService = new FilterService();
                var filteredBooks = filterService.FilterBooks(books, filterCriteria);

                if (sortCriteria == null)
                {
                    return Ok(filteredBooks.OrderByDescending(book => book.Id));
                }

                var sortService = new SortService();
                var sortedBooks = sortService.SortBooks(filteredBooks, sortCriteria);

                return Ok(sortedBooks);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
